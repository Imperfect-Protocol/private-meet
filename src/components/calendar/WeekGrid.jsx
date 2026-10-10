import { useEffect, useRef } from 'react';
import { ROWS_PER_DAY, SLOT_MINUTES, ViewerTime } from '../../lib/time/ViewerTime.js';

const ROW_PX = 14;
const SCROLL_TO_HOUR = 8;

/** Week view in the viewer's zone: 7 day columns, one row per 15 minutes. */
export function WeekGrid({ weekStart, meetings, isAvailable, onSelect }) {
  const scrollRef = useRef(null);
  const days = ViewerTime.weekDays(weekStart);
  const today = new Date();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = SCROLL_TO_HOUR * 4 * ROW_PX;
  }, []);

  return (
    <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-slate-700/60">
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`py-3 text-center text-sm font-semibold ${ViewerTime.sameDay(day, today) ? 'text-rose-300' : 'text-slate-300'}`}
          >
            {ViewerTime.dayHeader(day)}
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[4rem_repeat(7,1fr)]" style={{ height: ROWS_PER_DAY * ROW_PX }}>
          <div className="relative">
            {Array.from({ length: 24 }, (_unused, hour) => (
              <span key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-slate-500" style={{ top: hour * 4 * ROW_PX }}>
                {hour === 0 ? '' : ViewerTime.rowLabel(hour * 4)}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              meetings={meetings.filter((meeting) => ViewerTime.sameDay(new Date(meeting.startsAt), day))}
              isAvailable={isAvailable}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day, meetings, isAvailable, onSelect }) {
  return (
    <div className="relative border-l border-slate-800">
      {Array.from({ length: ROWS_PER_DAY }, (_unused, row) => (
        <div
          key={row}
          className={`border-slate-800/70 ${row % 4 === 3 ? 'border-b' : ''} ${isAvailable(day, row * SLOT_MINUTES) ? '' : 'bg-slate-950/50'}`}
          style={{ height: ROW_PX }}
        />
      ))}
      {meetings.map((meeting) => {
        const startMinute = ViewerTime.minuteOfDay(meeting.startsAt);
        const rows = Math.max(1, meeting.durationMinutes / SLOT_MINUTES);
        const isConfirmed = meeting.status === 'confirmed';
        return (
          <button
            key={meeting.id}
            type="button"
            onClick={() => onSelect(meeting)}
            className={`absolute inset-x-1 overflow-hidden rounded-md border px-2 py-0.5 text-left text-[11px] leading-tight shadow-lg transition hover:brightness-110 ${
              isConfirmed ? 'border-rose-300/60 bg-rose-500/85 text-white' : 'hatched border-amber-300/60 bg-amber-500/30 text-amber-50'
            }`}
            style={{ top: (startMinute / SLOT_MINUTES) * ROW_PX + 1, height: rows * ROW_PX - 2 }}
            title={meeting.title}
          >
            <span className="block truncate font-semibold">{meeting.title}</span>
            {rows > 1 ? <span className="block truncate opacity-80">{ViewerTime.range(meeting.startsAt, meeting.durationMinutes)}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
