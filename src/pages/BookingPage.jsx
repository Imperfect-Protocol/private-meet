import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Brand, Splash } from '../components/Splash.jsx';
import { ViewerTime } from '../lib/time/ViewerTime.js';

const DURATIONS = [15, 30, 45, 60];
const DEFAULT_DURATION = 30;

/** Public page from a host's booking link. Slots render in the guest's own time zone. */
export function BookingPage() {
  const params = useParams();
  const navigate = useNavigate();
  const host = useQuery(api.hosts.bySlug, { slug: params.slug });
  const book = useMutation(api.booking.book);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [weekStart, setWeekStart] = useState(() => ViewerTime.startOfWeek(new Date()));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const range = useMemo(() => ({ from: weekStart.getTime(), to: ViewerTime.addDays(weekStart, 7).getTime() }), [weekStart]);
  const slots = useQuery(api.booking.openSlots, host ? { slug: params.slug, durationMinutes, ...range } : 'skip');
  const days = ViewerTime.weekDays(weekStart);
  const isCurrentWeek = ViewerTime.sameDay(weekStart, ViewerTime.startOfWeek(new Date()));

  if (host === undefined) return <Splash label="Loading" />;
  if (host === null) return <Splash label="This booking link does not exist" />;

  const submit = (event) => {
    event.preventDefault();
    setError('');
    setIsBooking(true);
    book({
      slug: params.slug,
      startsAt: selectedSlot,
      durationMinutes,
      guestName: form.name,
      guestEmail: form.email,
      guestTimeZone: ViewerTime.timeZone(),
    })
      .then((meetingId) => navigate(`/book/${params.slug}/done/${meetingId}`))
      .catch((reason) => {
        setError(reason.message.replace(/^.*Uncaught Error: /, '').split('\n')[0]);
        setSelectedSlot(null);
      })
      .finally(() => setIsBooking(false));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <Brand />
        <span className="ml-auto rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">🌐 {ViewerTime.zoneLabel()}</span>
      </header>

      <section className="panel p-6">
        <p className="text-sm uppercase tracking-widest text-rose-300">Book a Private Meet</p>
        <h1 className="mt-1 text-3xl font-black text-white">Meet {host.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Pick a time that suits you. You will both get an email invite. At meeting time, open the link and play a friendly
          game of heads-up poker (1000 play chips, no real money) over a private peer-to-peer video call.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="label mb-0 mr-2">Length</span>
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => { setDurationMinutes(minutes); setSelectedSlot(null); }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${durationMinutes === minutes ? 'border-rose-400 bg-rose-500/20 text-white' : 'border-slate-600 text-slate-400 hover:text-white'}`}
            >
              {minutes === 60 ? '1 hour' : `${minutes} min`}
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <button className="btn-ghost px-3" type="button" disabled={isCurrentWeek} onClick={() => setWeekStart(ViewerTime.addDays(weekStart, -7))}>←</button>
          <button className="btn-ghost px-3" type="button" onClick={() => setWeekStart(ViewerTime.addDays(weekStart, 7))}>→</button>
          <h2 className="ml-2 font-bold text-white">{ViewerTime.monthLabel(weekStart)}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day) => {
            const daySlots = (slots ?? []).filter((slot) => ViewerTime.sameDay(new Date(slot), day));
            return (
              <div key={day.toISOString()} className="min-w-0">
                <p className="mb-2 text-center text-sm font-semibold text-slate-300">{ViewerTime.dayHeader(day)}</p>
                <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
                  {slots === undefined ? <p className="text-center text-xs text-slate-600">…</p> : null}
                  {slots && daySlots.length === 0 ? <p className="text-center text-xs text-slate-600">—</p> : null}
                  {daySlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-md border px-2 py-1.5 text-sm transition ${selectedSlot === slot ? 'border-rose-400 bg-rose-500 text-white' : 'border-slate-600 text-slate-200 hover:border-rose-400'}`}
                    >
                      {ViewerTime.clock(slot)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedSlot ? (
        <form className="panel grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={submit}>
          <p className="md:col-span-3 text-sm text-slate-300">
            {ViewerTime.fullDate(selectedSlot)}, {ViewerTime.range(selectedSlot, durationMinutes)}
          </p>
          <label className="block">
            <span className="label">Your name</span>
            <input className="field" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Your email</span>
            <input className="field" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <button className="btn-primary" disabled={isBooking} type="submit">{isBooking ? 'Booking…' : 'Book meeting'}</button>
        </form>
      ) : null}
      {error ? <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}
    </main>
  );
}
