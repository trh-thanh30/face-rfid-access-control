import { abortableDelay } from "./heartbeat-loop.js";

export interface ActuatorPort {
  open(durationMs: number): Promise<void>;
}

export class VirtualDoorActuator implements ActuatorPort {
  constructor(
    private readonly log: (event: string, details?: object) => void,
    private readonly wait: (milliseconds: number) => Promise<void> = (value) =>
      abortableDelay(value),
  ) {}

  async open(durationMs: number): Promise<void> {
    this.log("VIRTUAL_DOOR_OPEN", { durationMs });
    await this.wait(durationMs);
    this.log("VIRTUAL_DOOR_CLOSED");
  }
}
