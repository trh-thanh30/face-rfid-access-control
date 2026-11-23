import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AcknowledgeCommand } from "@access/shared";

export type StoredCommandStatus =
  | "RESERVED"
  | "ACTUATING"
  | "ACK_PENDING"
  | "ACKED";

export type StoredCommand = {
  commandId: string;
  sessionId: string;
  deviceId: string;
  status: StoredCommandStatus;
  firstSeenAt: string;
  acknowledgement?: AcknowledgeCommand;
};

type StoreFile = {
  version: 1;
  commands: Record<string, StoredCommand>;
};

export class PersistentCommandStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  reserve(input: {
    commandId: string;
    sessionId: string;
    deviceId: string;
    now: Date;
  }): Promise<boolean> {
    return this.exclusive(async () => {
      const state = await this.load();
      if (state.commands[input.commandId]) return false;
      state.commands[input.commandId] = {
        commandId: input.commandId,
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        status: "RESERVED",
        firstSeenAt: input.now.toISOString(),
      };
      await this.save(state);
      return true;
    });
  }

  markActuating(commandId: string): Promise<void> {
    return this.update(commandId, (command) => ({
      ...command,
      status: "ACTUATING",
    }));
  }

  queueAcknowledgement(
    commandId: string,
    acknowledgement: AcknowledgeCommand,
  ): Promise<void> {
    return this.update(commandId, (command) => ({
      ...command,
      status: "ACK_PENDING",
      acknowledgement,
    }));
  }

  markAcknowledged(commandId: string): Promise<void> {
    return this.update(commandId, (command) => ({
      ...command,
      status: "ACKED",
    }));
  }

  pendingAcknowledgements(): Promise<StoredCommand[]> {
    return this.exclusive(async () => {
      const state = await this.load();
      return Object.values(state.commands).filter(
        (command) =>
          command.status === "ACK_PENDING" && command.acknowledgement,
      );
    });
  }

  recoverInterrupted(now: Date): Promise<StoredCommand[]> {
    return this.exclusive(async () => {
      const state = await this.load();
      const recovered: StoredCommand[] = [];
      for (const command of Object.values(state.commands)) {
        if (command.status !== "RESERVED" && command.status !== "ACTUATING") {
          continue;
        }
        command.status = "ACK_PENDING";
        command.acknowledgement = {
          commandId: command.commandId,
          executionStatus: "UNKNOWN",
          timestamp: now.toISOString(),
          errorCode: "SIMULATOR_RESTART_DURING_ACTUATION",
        };
        recovered.push(command);
      }
      if (recovered.length > 0) await this.save(state);
      return recovered;
    });
  }

  private update(
    commandId: string,
    transform: (command: StoredCommand) => StoredCommand,
  ): Promise<void> {
    return this.exclusive(async () => {
      const state = await this.load();
      const command = state.commands[commandId];
      if (!command) throw new Error(`Command ${commandId} was not reserved`);
      state.commands[commandId] = transform(command);
      await this.save(state);
    });
  }

  private async load(): Promise<StoreFile> {
    try {
      const parsed = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as StoreFile;
      if (parsed.version !== 1 || !parsed.commands) throw new Error();
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1, commands: {} };
      }
      throw new Error("Command store is unreadable; refusing to actuate", {
        cause: error,
      });
    }
  }

  private async save(state: StoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporaryPath, this.filePath);
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
