import { randomUUID } from "node:crypto";
import type {
  AcknowledgeCommand,
  AccessSessionResponse,
  ActuationCommand,
} from "@access/shared";
import type { SimulatorConfig } from "./config.js";
import { DeviceHttpError, type DeviceApiClient } from "./device-api-client.js";
import type { PersistentCommandStore, StoredCommand } from "./command-store.js";
import type { ActuatorPort } from "./virtual-actuator.js";
import { abortableDelay } from "./heartbeat-loop.js";

export type SimulatorSignal =
  | "ACCESS_ALLOWED"
  | "ACCESS_DENIED"
  | "SESSION_EXPIRED"
  | "POLL_TIMEOUT"
  | "NETWORK_ERROR"
  | "COMMAND_REPLAY_SKIPPED"
  | "COMMAND_INVALID"
  | "ACTUATION_FAILED"
  | "ACK_PENDING"
  | "ACKED";

export type AccessAttemptResult = {
  outcome: SimulatorSignal;
  sessionId?: string;
  commandId?: string;
  reasonCode?: string;
};

type DeviceApiPort = Pick<
  DeviceApiClient,
  "createSession" | "pollSession" | "acknowledge"
>;

export class AccessStateMachine {
  constructor(
    private readonly config: SimulatorConfig,
    private readonly authenticatedDeviceId: string,
    private readonly api: DeviceApiPort,
    private readonly store: PersistentCommandStore,
    private readonly actuator: ActuatorPort,
    private readonly onSignal: (
      signal: SimulatorSignal,
      details?: Record<string, unknown>,
    ) => void,
    private readonly now: () => Date = () => new Date(),
    private readonly wait: (milliseconds: number) => Promise<void> = (value) =>
      abortableDelay(value),
  ) {}

  async run(
    uid: string,
    requestId: string = randomUUID(),
  ): Promise<AccessAttemptResult> {
    let session: AccessSessionResponse;
    try {
      session = await this.api.createSession(uid, requestId);
      session = await this.pollUntilTerminal(session);
    } catch (error) {
      if (error instanceof PollTimeoutError) {
        return this.fail("POLL_TIMEOUT", { message: error.message });
      }
      return this.fail("NETWORK_ERROR", {
        message:
          error instanceof Error ? error.message : "Device API unavailable",
      });
    }

    if (session.status === "DENIED") {
      return this.fail("ACCESS_DENIED", {
        sessionId: session.sessionId,
        reasonCode: session.reasonCode,
      });
    }
    if (session.status === "EXPIRED") {
      return this.fail("SESSION_EXPIRED", {
        sessionId: session.sessionId,
        reasonCode: session.reasonCode,
      });
    }
    if (session.status !== "ALLOWED" || !session.command) {
      return this.fail("POLL_TIMEOUT", { sessionId: session.sessionId });
    }

    const invalidReason = this.validateCommand(session, session.command);
    if (invalidReason) {
      return this.fail("COMMAND_INVALID", {
        sessionId: session.sessionId,
        commandId: session.command.commandId,
        reason: invalidReason,
      });
    }

    const command = session.command;
    const reserved = await this.store.reserve({
      commandId: command.commandId,
      sessionId: session.sessionId,
      deviceId: command.deviceId,
      now: this.now(),
    });
    if (!reserved) {
      return this.fail("COMMAND_REPLAY_SKIPPED", {
        sessionId: session.sessionId,
        commandId: command.commandId,
      });
    }

    await this.store.markActuating(command.commandId);
    let acknowledgement: AcknowledgeCommand;
    let actuationFailed = false;
    try {
      await this.actuator.open(command.openDurationMs);
      acknowledgement = {
        commandId: command.commandId,
        executionStatus: "APPLIED_UNCONFIRMED",
        timestamp: this.now().toISOString(),
      };
      this.onSignal("ACCESS_ALLOWED", {
        sessionId: session.sessionId,
        commandId: command.commandId,
      });
    } catch {
      actuationFailed = true;
      acknowledgement = {
        commandId: command.commandId,
        executionStatus: "FAILED",
        timestamp: this.now().toISOString(),
        errorCode: "VIRTUAL_ACTUATOR_FAILED",
      };
      this.onSignal("ACTUATION_FAILED", { commandId: command.commandId });
    }
    await this.store.queueAcknowledgement(command.commandId, acknowledgement);
    const acknowledged = await this.retryAcknowledgement(
      session.sessionId,
      command.commandId,
      acknowledgement,
    );
    return {
      outcome: actuationFailed
        ? "ACTUATION_FAILED"
        : acknowledged
          ? "ACKED"
          : "ACK_PENDING",
      sessionId: session.sessionId,
      commandId: command.commandId,
    };
  }

  async recoverAndFlush(): Promise<void> {
    await this.store.recoverInterrupted(this.now());
    const pending = await this.store.pendingAcknowledgements();
    for (const command of pending) {
      await this.flushStoredAcknowledgement(command);
    }
  }

  private async pollUntilTerminal(
    initial: AccessSessionResponse,
  ): Promise<AccessSessionResponse> {
    let current = initial;
    let delayMs = this.config.pollInitialDelayMs;
    const localDeadline = this.now().getTime() + this.config.pollTimeoutMs;
    while (current.status === "PENDING" || current.status === "VERIFYING") {
      const serverDeadline = new Date(current.expiresAt).getTime();
      const deadline = Math.min(localDeadline, serverDeadline);
      const remainingMs = deadline - this.now().getTime();
      if (remainingMs <= 0) {
        throw new PollTimeoutError("Session polling timed out");
      }
      await this.wait(Math.min(delayMs, remainingMs));
      if (this.now().getTime() >= deadline) {
        throw new PollTimeoutError("Session polling timed out");
      }
      current = await this.api.pollSession(current.sessionId);
      delayMs = Math.min(delayMs * 2, this.config.pollMaxDelayMs);
    }
    return current;
  }

  private validateCommand(
    session: AccessSessionResponse,
    command: ActuationCommand,
  ): string | null {
    if (command.sessionId !== session.sessionId) return "SESSION_MISMATCH";
    if (command.deviceId !== this.authenticatedDeviceId)
      return "DEVICE_MISMATCH";
    if (new Date(command.expiresAt) <= this.now()) return "COMMAND_EXPIRED";
    return null;
  }

  private async flushStoredAcknowledgement(command: StoredCommand) {
    if (!command.acknowledgement) return;
    await this.retryAcknowledgement(
      command.sessionId,
      command.commandId,
      command.acknowledgement,
    );
  }

  private async retryAcknowledgement(
    sessionId: string,
    commandId: string,
    acknowledgement: AcknowledgeCommand,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= this.config.ackMaxAttempts; attempt += 1) {
      try {
        await this.api.acknowledge(sessionId, acknowledgement);
        await this.store.markAcknowledged(commandId);
        this.onSignal("ACKED", { commandId, attempt });
        return true;
      } catch (error) {
        if (error instanceof DeviceHttpError && error.status < 500) break;
        if (attempt < this.config.ackMaxAttempts) {
          await this.wait(this.config.ackRetryDelayMs);
        }
      }
    }
    this.onSignal("ACK_PENDING", { commandId });
    return false;
  }

  private fail(
    outcome: SimulatorSignal,
    details: Record<string, unknown>,
  ): AccessAttemptResult {
    this.onSignal(outcome, details);
    return {
      outcome,
      sessionId:
        typeof details.sessionId === "string" ? details.sessionId : undefined,
      commandId:
        typeof details.commandId === "string" ? details.commandId : undefined,
      reasonCode:
        typeof details.reasonCode === "string" ? details.reasonCode : undefined,
    };
  }
}

class PollTimeoutError extends Error {}
