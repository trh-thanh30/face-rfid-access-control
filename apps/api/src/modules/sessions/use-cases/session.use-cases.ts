import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AcknowledgeCommand,
  AccessSessionResponse,
  CreateAccessSession,
} from "@access/shared";
import { CLOCK_PORT, type ClockPort } from "../../../common/clock/clock.port";
import { CheckAccessEligibilityUseCase } from "../../access-management/use-cases/access-management.use-cases";
import {
  DEVICE_REPOSITORY,
  type DeviceRepository,
} from "../../devices/repository/device.repository.interface";
import type { DevicePrincipal } from "../../devices/use-cases/device.use-cases";
import {
  FACE_VERIFIER_PORT,
  type FaceVerifierPort,
} from "../face-verifier/face-verifier.port";
import {
  SESSION_REPOSITORY,
  type SessionRecord,
  type SessionRepository,
} from "../repository/session.repository.interface";

@Injectable()
export class CreateAccessSessionUseCase {
  private readonly logger = new Logger(CreateAccessSessionUseCase.name);
  private readonly sessionTtlMs: number;
  private readonly commandTtlMs: number;
  private readonly openDurationMs: number;

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly eligibility: CheckAccessEligibilityUseCase,
    @Inject(FACE_VERIFIER_PORT) private readonly verifier: FaceVerifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    config: ConfigService,
  ) {
    this.sessionTtlMs =
      config.getOrThrow<number>("AUTH_SESSION_TTL_SECONDS") * 1000;
    this.commandTtlMs =
      config.getOrThrow<number>("ACTUATION_COMMAND_TTL_SECONDS") * 1000;
    this.openDurationMs = config.getOrThrow<number>(
      "ACTUATION_OPEN_DURATION_MS",
    );
  }

  async execute(
    principal: DevicePrincipal,
    request: CreateAccessSession,
  ): Promise<AccessSessionResponse> {
    if (request.deviceCode !== principal.deviceCode) {
      throw new UnauthorizedException("DEVICE_IDENTITY_MISMATCH");
    }
    const createdAt = this.clock.now();
    const { session, created } = await this.sessions.createOrFind({
      deviceId: principal.id,
      request,
      correlationId: randomUUID(),
      createdAt,
      expiresAt: new Date(createdAt.getTime() + this.sessionTtlMs),
    });

    if (!created) return this.currentResponse(session);
    if (
      !(await this.sessions.claimForVerification(session.id, this.clock.now()))
    ) {
      return this.currentResponse(await this.requireSession(session.id));
    }

    const firstCheck = await this.eligibility.execute({
      uid: request.rfidUid,
      accessPointId: principal.accessPointId,
      occurredAt: this.clock.now(),
    });
    if (!firstCheck.allowed) {
      return this.currentResponse(
        await this.sessions.deny({
          sessionId: session.id,
          reasonCode: firstCheck.reasonCode!,
          credentialId: firstCheck.credentialId,
          personId: firstCheck.personId,
          completedAt: this.clock.now(),
        }),
      );
    }

    let evidence;
    try {
      evidence = await this.verifier.verify({
        sessionId: session.id,
        correlationId: session.correlationId,
        personId: firstCheck.personId!,
        deadline: session.expiresAt,
      });
    } catch {
      return this.currentResponse(
        await this.sessions.deny({
          sessionId: session.id,
          reasonCode: "INTERNAL_ERROR",
          credentialId: firstCheck.credentialId,
          personId: firstCheck.personId,
          grantId: firstCheck.grantId,
          completedAt: this.clock.now(),
        }),
      );
    }

    const decisionAt = this.clock.now();
    if (decisionAt >= session.expiresAt) {
      return this.currentResponse(
        await this.sessions.expire(session.id, decisionAt),
      );
    }
    if (!evidence.matched) {
      return this.currentResponse(
        await this.sessions.deny({
          sessionId: session.id,
          reasonCode: evidence.reasonCode ?? "FACE_MISMATCH",
          credentialId: firstCheck.credentialId,
          personId: firstCheck.personId,
          grantId: firstCheck.grantId,
          evidence,
          completedAt: decisionAt,
        }),
      );
    }

    const finalCheck = await this.eligibility.execute({
      uid: request.rfidUid,
      accessPointId: principal.accessPointId,
      occurredAt: decisionAt,
    });
    if (!finalCheck.allowed) {
      return this.currentResponse(
        await this.sessions.deny({
          sessionId: session.id,
          reasonCode: finalCheck.reasonCode!,
          credentialId: finalCheck.credentialId,
          personId: finalCheck.personId,
          evidence,
          completedAt: decisionAt,
        }),
      );
    }

    const commandExpiresAt = new Date(
      Math.min(
        session.expiresAt.getTime(),
        decisionAt.getTime() + this.commandTtlMs,
      ),
    );
    return this.currentResponse(
      await this.sessions.allow({
        sessionId: session.id,
        credentialId: finalCheck.credentialId!,
        personId: finalCheck.personId!,
        grantId: finalCheck.grantId!,
        evidence,
        completedAt: decisionAt,
        commandExpiresAt,
        openDurationMs: this.openDurationMs,
      }),
    );
  }

  private async requireSession(id: string) {
    const session = await this.sessions.findById(id);
    if (!session) throw new NotFoundException("AUTH_SESSION_NOT_FOUND");
    return session;
  }

  private currentResponse(session: SessionRecord) {
    const now = this.clock.now();
    this.logger.log({
      event: "auth_session_response",
      correlationId: session.correlationId,
      sessionId: session.id,
      status: session.status,
      decisionLatencyMs: session.completedAt
        ? elapsedMs(session.createdAt, session.completedAt)
        : undefined,
    });
    return toResponse(session, now);
  }
}

@Injectable()
export class PollAccessSessionUseCase {
  private readonly logger = new Logger(PollAccessSessionUseCase.name);
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(principal: DevicePrincipal, sessionId: string) {
    let session = await this.sessions.findById(sessionId);
    if (!session) throw new NotFoundException("AUTH_SESSION_NOT_FOUND");
    if (session.deviceId !== principal.id) {
      throw new ForbiddenException("DEVICE_SESSION_OWNERSHIP_REQUIRED");
    }
    const now = this.clock.now();
    if (
      (session.status === "PENDING" || session.status === "VERIFYING") &&
      now >= session.expiresAt
    ) {
      session = await this.sessions.expire(session.id, now);
    }
    this.logger.log({
      event: "auth_session_poll",
      correlationId: session.correlationId,
      sessionId: session.id,
      status: session.status,
    });
    return toResponse(session, now);
  }
}

@Injectable()
export class AcknowledgeCommandUseCase {
  private readonly logger = new Logger(AcknowledgeCommandUseCase.name);
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(
    principal: DevicePrincipal,
    sessionId: string,
    acknowledgement: AcknowledgeCommand,
  ): Promise<void> {
    const device = await this.devices.findById(principal.id);
    if (!device) throw new NotFoundException("DEVICE_NOT_FOUND");
    const capabilities = device.capabilities as { doorSensor?: boolean } | null;
    if (
      acknowledgement.executionStatus === "CONFIRMED" &&
      capabilities?.doorSensor !== true
    ) {
      throw new BadRequestException("DOOR_SENSOR_REQUIRED_FOR_CONFIRMED");
    }
    const result = await this.sessions.acknowledge({
      sessionId,
      deviceId: principal.id,
      commandId: acknowledgement.commandId,
      executionStatus: acknowledgement.executionStatus,
      errorCode: acknowledgement.errorCode,
      deviceTimestamp: new Date(acknowledgement.timestamp),
      receivedAt: this.clock.now(),
    });
    this.logger.log({
      event: "actuation_ack",
      sessionId,
      commandId: acknowledgement.commandId,
      executionStatus: acknowledgement.executionStatus,
      result,
    });
    if (result === "NOT_FOUND")
      throw new NotFoundException("COMMAND_NOT_FOUND");
    if (result === "EXPIRED") throw new ConflictException("COMMAND_EXPIRED");
    if (result === "CONFLICT") throw new ConflictException("ACK_CONFLICT");
  }
}

function elapsedMs(startedAt: Date, completedAt: Date): number {
  return Math.max(0, completedAt.getTime() - startedAt.getTime());
}

function toResponse(session: SessionRecord, now: Date): AccessSessionResponse {
  const response: AccessSessionResponse = {
    sessionId: session.id,
    correlationId: session.correlationId,
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
  };
  if (session.status === "ALLOWED") response.allowed = true;
  if (session.status === "DENIED" || session.status === "EXPIRED") {
    response.allowed = false;
  }
  if (session.reasonCode) response.reasonCode = session.reasonCode;
  if (
    session.status === "ALLOWED" &&
    session.command &&
    !session.command.acknowledgedAt &&
    session.command.expiresAt > now
  ) {
    response.command = {
      commandId: session.command.id,
      sessionId: session.command.sessionId,
      deviceId: session.command.deviceId,
      expiresAt: session.command.expiresAt.toISOString(),
      openDurationMs: session.command.openDurationMs,
    };
  }
  return response;
}
