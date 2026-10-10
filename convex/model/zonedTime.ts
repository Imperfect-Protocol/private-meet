export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

export type LocalDate = { year: number; month: number; day: number };

/** Calendar arithmetic for one IANA time zone, backed only by Intl. */
export class ZonedClock {
  readonly timeZone: string;
  private readonly format: Intl.DateTimeFormat;

  constructor(timeZone: string) {
    this.timeZone = ZonedClock.isValid(timeZone) ? timeZone : "UTC";
    this.format = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  static isValid(timeZone: string): boolean {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
      return true;
    } catch {
      return false;
    }
  }

  /** Wall-clock fields of an instant in this zone. */
  fields(instant: number) {
    const parts: Record<string, number> = {};
    for (const part of this.format.formatToParts(instant)) {
      if (part.type !== "literal") parts[part.type] = Number(part.value);
    }
    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      minute: (parts.hour % 24) * 60 + parts.minute,
      second: parts.second,
    };
  }

  offsetMinutes(instant: number): number {
    const f = this.fields(instant);
    const asUtc = Date.UTC(f.year, f.month - 1, f.day, 0, f.minute, f.second);
    return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / MINUTE_MS);
  }

  /** UTC instant of a wall-clock time in this zone. */
  instant(date: LocalDate, minuteOfDay: number): number {
    const guess = Date.UTC(date.year, date.month - 1, date.day, 0, minuteOfDay);
    const first = guess - this.offsetMinutes(guess) * MINUTE_MS;
    const second = guess - this.offsetMinutes(first) * MINUTE_MS;
    return second;
  }

  localDate(instant: number): LocalDate {
    const f = this.fields(instant);
    return { year: f.year, month: f.month, day: f.day };
  }
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function weekday(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}
