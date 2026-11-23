import type { AuthSessionStatus } from "@access/shared";

const TERMINAL = new Set<AuthSessionStatus>(["ALLOWED", "DENIED", "EXPIRED"]);

export function isTerminalSessionStatus(status: AuthSessionStatus): boolean {
  return TERMINAL.has(status);
}

export function canTransitionSession(
  from: AuthSessionStatus,
  to: AuthSessionStatus,
): boolean {
  if (isTerminalSessionStatus(from)) return false;
  if (from === "PENDING")
    return to === "VERIFYING" || to === "DENIED" || to === "EXPIRED";
  return from === "VERIFYING" && ["ALLOWED", "DENIED", "EXPIRED"].includes(to);
}
