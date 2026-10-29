import { useMemo, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SiteNav } from '../components/SiteNav.jsx';
import { MeetingPopup } from '../components/calendar/MeetingPopup.jsx';
import { SettingsDialog } from '../components/calendar/SettingsDialog.jsx';
import { WeekGrid } from '../components/calendar/WeekGrid.jsx';
import { ViewerTime } from '../lib/time/ViewerTime.js';
import { DemoDisclaimerFooter } from '../components/DemoDisclaimerFooter.jsx'

export function CalendarPage() {
  const authActions = useAuthActions();
  const host = useQuery(api.hosts.me);
  const [weekStart, setWeekStart] = useState(() => ViewerTime.startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const range = useMemo(() => ({ from: weekStart.getTime(), to: ViewerTime.addDays(weekStart, 7).getTime() }), [weekStart]);
  const meetings = useQuery(api.meetings.listRange, range) ?? [];

  const availabilityClock = useMemo(() => host ? new Intl.DateTimeFormat('en-US', {
    timeZone: host.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }) : null, [host?.timeZone]);
  const isAvailable = (day, minute) => {
    if (!host || !availabilityClock) return false;
    const instant = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minute);
    const parts = Object.fromEntries(availabilityClock.formatToParts(instant).map((part) => [part.type, part.value]));
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const hostMinute = Number(parts.hour) * 60 + Number(parts.minute);
    return host.windows.some((window) => window.weekday === weekday && hostMinute >= window.startMinute && hostMinute < window.endMinute);
  };
  const selectedMeeting = selected ? meetings.find((meeting) => meeting.id === selected.id) ?? selected : null;

  const copyBookingLink = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/book/${host.slug}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <main className="flex h-screen flex-col gap-4 p-4 md:p-6">
      <SiteNav/>
      <header className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400" title="Times are shown in your browser's time zone">
          🌐 {ViewerTime.zoneLabel()}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-primary" type="button" onClick={copyBookingLink}>{copied ? 'Copied ✓' : 'Copy booking link'}</button>
          <button className="btn-ghost" type="button" onClick={() => setShowSettings(true)}>Settings</button>
          <button className="btn-ghost" type="button" onClick={() => void authActions.signOut()}>Sign out</button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost px-3" type="button" onClick={() => setWeekStart(ViewerTime.addDays(weekStart, -7))} aria-label="Previous week">←</button>
        <button className="btn-ghost px-3" type="button" onClick={() => setWeekStart(ViewerTime.addDays(weekStart, 7))} aria-label="Next week">→</button>
        <button className="btn-ghost" type="button" onClick={() => setWeekStart(ViewerTime.startOfWeek(new Date()))}>Today</button>
        <input
          className="field w-auto"
          type="date"
          value={ViewerTime.toDateInput(weekStart)}
          onChange={(event) => event.target.value && setWeekStart(ViewerTime.startOfWeek(ViewerTime.fromDateInput(event.target.value)))}
          aria-label="Jump to date"
        />
        <h1 className="ml-2 text-xl font-bold text-white">{ViewerTime.monthLabel(weekStart)}</h1>
        <span className="ml-auto text-xs text-slate-500">
          <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-rose-500 align-middle" />confirmed
          <span className="hatched ml-3 mr-1 inline-block h-3 w-3 rounded-sm bg-amber-500/40 align-middle" />awaiting replies
        </span>
      </div>

      <WeekGrid weekStart={weekStart} meetings={meetings} isAvailable={isAvailable} onSelect={setSelected} />

      {selectedMeeting ? <MeetingPopup meeting={selectedMeeting} onClose={() => setSelected(null)} /> : null}
      {showSettings && host ? <SettingsDialog host={host} onClose={() => setShowSettings(false)} /> : null}
      <DemoDisclaimerFooter/>
    </main>
  );
}
