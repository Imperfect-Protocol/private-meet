import { addDays, MINUTE_MS, weekday, ZonedClock } from "./zonedTime";

export const SLOT_STEP_MINUTES = 15;
export const MEETING_DURATIONS = [15, 30, 45, 60] as const;
export const DEFAULT_DURATION_MINUTES = 30;
export const MAX_RANGE_MS = 8 * 24 * 60 * MINUTE_MS;

export type AvailabilityWindow = { weekday: number; startMinute: number; endMinute: number };
export type BusyInterval = { startsAt: number; durationMinutes: number };

export function isMeetingDuration(minutes: number): boolean {
  return (MEETING_DURATIONS as readonly number[]).includes(minutes);
}

/** A host's bookable slots: availability windows minus busy meetings, in UTC instants. */
export class SlotGrid {
  constructor(
    private readonly clock: ZonedClock,
    private readonly windows: AvailabilityWindow[],
    private readonly busy: BusyInterval[],
  ) {}

  open(from: number, to: number, durationMinutes: number, now: number): number[] {
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > MAX_RANGE_MS) return [];
    if (!isMeetingDuration(durationMinutes)) return [];
    const slots = new Set<number>();
    const durationMs = durationMinutes * MINUTE_MS;
    const last = this.clock.localDate(to);
    for (let date = addDays(this.clock.localDate(from), -1); ; date = addDays(date, 1)) {
      const day = weekday(date);
      for (const window of this.windows) {
        if (window.weekday !== day) continue;
        for (let minute = window.startMinute; minute + durationMinutes <= window.endMinute; minute += SLOT_STEP_MINUTES) {
          const startsAt = this.clock.instant(date, minute);
          if (startsAt < from || startsAt >= to || startsAt <= now) continue;
          if (this.overlapsBusy(startsAt, startsAt + durationMs)) continue;
          slots.add(startsAt);
        }
      }
      if (date.year === last.year && date.month === last.month && date.day === last.day) break;
    }
    return [...slots].sort((a, b) => a - b);
  }

  private overlapsBusy(startsAt: number, endsAt: number): boolean {
    return this.busy.some((meeting) => (
      startsAt < meeting.startsAt + meeting.durationMinutes * MINUTE_MS && meeting.startsAt < endsAt
    ));
  }
}
