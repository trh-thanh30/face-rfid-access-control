import { isAccessWindowOpen } from "../domain/access-window";

describe("isAccessWindowOpen", () => {
  const daytime = {
    validFrom: "2026-11-22",
    validUntil: "2026-11-22",
    timeFrom: "08:00:00",
    timeUntil: "17:00:00",
    timezone: "Asia/Ho_Chi_Minh",
  };

  it("uses the grant timezone and includes the opening boundary", () => {
    expect(isAccessWindowOpen(daytime, new Date("2026-11-22T01:00:00Z"))).toBe(
      true,
    );
    expect(isAccessWindowOpen(daytime, new Date("2026-11-22T00:59:59Z"))).toBe(
      false,
    );
  });

  it("excludes the closing boundary", () => {
    expect(isAccessWindowOpen(daytime, new Date("2026-11-22T10:00:00Z"))).toBe(
      false,
    );
  });

  it("anchors an overnight window to its start date", () => {
    const overnight = {
      ...daytime,
      timeFrom: "22:00:00",
      timeUntil: "06:00:00",
    };

    expect(
      isAccessWindowOpen(overnight, new Date("2026-11-22T16:00:00Z")),
    ).toBe(true);
    expect(
      isAccessWindowOpen(overnight, new Date("2026-11-22T22:59:59Z")),
    ).toBe(true);
    expect(
      isAccessWindowOpen(overnight, new Date("2026-11-22T23:00:00Z")),
    ).toBe(false);
  });

  it("handles the first and last valid dates", () => {
    const range = {
      ...daytime,
      validFrom: "2026-11-01",
      validUntil: "2026-11-30",
    };
    expect(isAccessWindowOpen(range, new Date("2026-11-01T02:00:00Z"))).toBe(
      true,
    );
    expect(isAccessWindowOpen(range, new Date("2026-11-30T02:00:00Z"))).toBe(
      true,
    );
    expect(isAccessWindowOpen(range, new Date("2026-12-01T02:00:00Z"))).toBe(
      false,
    );
  });
});
