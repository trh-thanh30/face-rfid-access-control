import {
  canTransitionSession,
  isTerminalSessionStatus,
} from "../domain/session-transition.policy";

describe("session transition policy", () => {
  it("allows only the documented forward transitions", () => {
    expect(canTransitionSession("PENDING", "VERIFYING")).toBe(true);
    expect(canTransitionSession("VERIFYING", "ALLOWED")).toBe(true);
    expect(canTransitionSession("VERIFYING", "DENIED")).toBe(true);
    expect(canTransitionSession("VERIFYING", "EXPIRED")).toBe(true);
    expect(canTransitionSession("PENDING", "ALLOWED")).toBe(false);
  });

  it.each(["ALLOWED", "DENIED", "EXPIRED"] as const)(
    "never leaves terminal state %s",
    (status) => {
      expect(isTerminalSessionStatus(status)).toBe(true);
      expect(canTransitionSession(status, "VERIFYING")).toBe(false);
    },
  );
});
