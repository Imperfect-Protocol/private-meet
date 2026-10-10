export const MINUTE_MS = 60_000;
export const SLOT_MINUTES = 15;
export const ROWS_PER_DAY = (24 * 60) / SLOT_MINUTES;

const pad = (value) => String(value).padStart(2, '0');

/**
 * Times as seen by the person in front of the screen: the browser's own time zone.
 * Instants are UTC milliseconds everywhere else.
 */
export const ViewerTime = Object.freeze({
  timeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  },

  zoneLabel(at = new Date()) {
    const offset = -at.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    return `${ViewerTime.timeZone()} (UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)})`;
  },

  /** Monday 00:00 local of the week containing `date`. */
  startOfWeek(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  },

  addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  },

  weekDays(weekStart) {
    return Array.from({ length: 7 }, (_unused, index) => ViewerTime.addDays(weekStart, index));
  },

  sameDay(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  },

  minuteOfDay(instant) {
    const date = new Date(instant);
    return date.getHours() * 60 + date.getMinutes();
  },

  toDateInput(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  },

  fromDateInput(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  dayHeader(date) {
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  },

  monthLabel(weekStart) {
    return weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  },

  clock(instant) {
    return new Date(instant).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  },

  rowLabel(row) {
    const minutes = row * SLOT_MINUTES;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  },

  fullDate(instant) {
    return new Date(instant).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  range(startsAt, durationMinutes) {
    return `${ViewerTime.clock(startsAt)} – ${ViewerTime.clock(startsAt + durationMinutes * MINUTE_MS)}`;
  },
});
