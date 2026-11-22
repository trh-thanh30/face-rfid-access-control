export type AccessWindow = {
  validFrom: string;
  validUntil: string;
  timeFrom: string;
  timeUntil: string;
  timezone: string;
};

export function isAccessWindowOpen(
  window: AccessWindow,
  instant: Date,
): boolean {
  const local = localDateTime(instant, window.timezone);
  const overnight = window.timeFrom > window.timeUntil;

  if (!overnight) {
    return (
      isDateInRange(local.date, window) &&
      local.time >= window.timeFrom &&
      local.time < window.timeUntil
    );
  }

  const scheduleDate =
    local.time >= window.timeFrom
      ? local.date
      : local.time < window.timeUntil
        ? previousDate(local.date)
        : null;

  return scheduleDate !== null && isDateInRange(scheduleDate, window);
}

export function isAccessWindowDefinitionValid(window: AccessWindow): boolean {
  if (
    window.validFrom > window.validUntil ||
    window.timeFrom === window.timeUntil
  ) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: window.timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function isDateInRange(date: string, window: AccessWindow): boolean {
  return date >= window.validFrom && date <= window.validUntil;
}

function localDateTime(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}:${value("second")}`,
  };
}

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}
