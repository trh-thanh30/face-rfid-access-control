import { randomUUID } from "node:crypto";
import type {
  AccessStateMachine,
  AccessAttemptResult,
} from "./access-state-machine.js";
import type { SimulatorInput } from "./input.js";

export async function runScenario(
  machine: AccessStateMachine,
  input: SimulatorInput,
): Promise<AccessAttemptResult[]> {
  const requestId = input.requestId ?? randomUUID();
  if (input.scenario === "duplicate") {
    return Promise.all([
      machine.run(input.uid, requestId),
      machine.run(input.uid, requestId),
    ]);
  }
  return [await machine.run(input.uid, requestId)];
}
