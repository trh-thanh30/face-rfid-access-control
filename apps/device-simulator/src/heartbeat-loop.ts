import type { SimulatorConfig } from "./config.js";
import { sendHeartbeat } from "./heartbeat-client.js";

export type HeartbeatSignal =
  | { type: "HEARTBEAT_OK"; deviceId: string }
  | { type: "HEARTBEAT_ERROR"; message: string };

export async function runHeartbeatLoop(
  config: SimulatorConfig,
  signal: AbortSignal,
  options: {
    send?: typeof sendHeartbeat;
    onSignal?: (signal: HeartbeatSignal) => void;
    wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  } = {},
): Promise<void> {
  const send = options.send ?? sendHeartbeat;
  const onSignal = options.onSignal ?? (() => undefined);
  const wait = options.wait ?? abortableDelay;

  while (!signal.aborted) {
    try {
      onSignal({ type: "HEARTBEAT_OK", deviceId: await send(config) });
    } catch (error) {
      onSignal({
        type: "HEARTBEAT_ERROR",
        message: error instanceof Error ? error.message : "Heartbeat failed",
      });
    }
    if (!signal.aborted) {
      try {
        await wait(config.heartbeatIntervalMs, signal);
      } catch {
        return;
      }
    }
  }
}

export function abortableDelay(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Aborted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
