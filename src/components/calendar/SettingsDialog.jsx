import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Modal } from '../Modal.jsx';
import { ViewerTime } from '../../lib/time/ViewerTime.js';

const WEEKDAYS = [
  { day: 1, label: 'Mon' }, { day: 2, label: 'Tue' }, { day: 3, label: 'Wed' }, { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' }, { day: 6, label: 'Sat' }, { day: 0, label: 'Sun' },
];

const toClock = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const fromClock = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Profile + weekly availability (one daily window, in the host's own time zone). */
export function SettingsDialog({ host, onClose }) {
  const updateSettings = useMutation(api.hosts.updateSettings);
  const first = host.windows[0] ?? { startMinute: 540, endMinute: 1020 };
  const [form, setForm] = useState({
    displayName: host.displayName,
    email: host.email,
    timeZone: host.timeZone,
    days: new Set(host.windows.map((window) => window.weekday)),
    start: toClock(first.startMinute),
    end: toClock(first.endMinute === 1440 ? 1439 : first.endMinute),
  });
  const [error, setError] = useState('');

  const toggleDay = (day) => {
    const days = new Set(form.days);
    if (days.has(day)) days.delete(day);
    else days.add(day);
    setForm({ ...form, days });
  };

  const save = (event) => {
    event.preventDefault();
    const startMinute = fromClock(form.start);
    const endMinute = fromClock(form.end);
    if (endMinute <= startMinute) {
      setError('End time must be after start time.');
      return;
    }
    const windows = [...form.days].map((weekday) => ({ weekday, startMinute, endMinute }));
    updateSettings({ displayName: form.displayName, email: form.email, timeZone: form.timeZone, windows })
      .then(onClose)
      .catch((reason) => setError(reason.message));
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <form className="space-y-4" onSubmit={save}>
        <label className="block">
          <span className="label">Display name</span>
          <input className="field" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        </label>
        <label className="block">
          <span className="label">Invite email</span>
          <input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="block">
          <span className="label">Working hours time zone</span>
          <div className="flex gap-2">
            <input className="field" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} />
            <button className="btn-ghost shrink-0" type="button" onClick={() => setForm({ ...form, timeZone: ViewerTime.timeZone() })}>
              Use mine
            </button>
          </div>
        </label>
        <div>
          <span className="label">Available days</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((weekday) => (
              <button
                key={weekday.day}
                type="button"
                onClick={() => toggleDay(weekday.day)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${form.days.has(weekday.day) ? 'border-rose-400 bg-rose-500/20 text-white' : 'border-slate-600 text-slate-400'}`}
              >
                {weekday.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">From</span>
            <input className="field" type="time" step="900" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">To</span>
            <input className="field" type="time" step="900" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} />
          </label>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" type="submit">Save</button>
        </div>
      </form>
    </Modal>
  );
}
