import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Brand, Splash } from '../components/Splash.jsx';
import { meetingLink } from '../components/calendar/MeetingPopup.jsx';
import { ViewerTime } from '../lib/time/ViewerTime.js';

export function InvitePage() {
  const params = useParams();
  const invite = useQuery(api.invites.byToken, { token: params.token });
  const respond = useMutation(api.invites.respond);
  const [error, setError] = useState('');

  if (invite === undefined) return <Splash label="Loading invite" />;
  if (invite === null) return <Splash label="This invite does not exist" />;

  const otherName = invite.role === 'host' ? invite.guestName : invite.hostName;
  const link = meetingLink(invite.meetingId, params.token);
  const answer = (accept) => respond({ token: params.token, accept }).catch((reason) => setError(reason.message));

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="panel w-full max-w-md p-8">
        <Brand />
        <p className="mt-6 text-sm uppercase tracking-widest text-rose-300">Invitation</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Private Meet with {otherName}</h1>
        <p className="mt-4 text-slate-200">{ViewerTime.fullDate(invite.startsAt)}</p>
        <p className="text-slate-300">{ViewerTime.range(invite.startsAt, invite.durationMinutes)} · {invite.durationMinutes} min</p>
        <p className="mt-1 text-xs text-slate-500">🌐 {ViewerTime.zoneLabel(new Date(invite.startsAt))}</p>

        {invite.state === 'accepted' || invite.state === 'declined' ? (
          <p className={`mt-6 rounded-lg p-3 text-sm ${invite.state === 'accepted' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700/40 text-slate-300'}`}>
            You {invite.state} this invite. Meeting status: <strong className="capitalize">{invite.status}</strong>.
          </p>
        ) : (
          <div className="mt-6 flex gap-2">
            <button className="btn-primary flex-1" type="button" onClick={() => answer(true)}>Accept</button>
            <button className="btn-ghost flex-1" type="button" onClick={() => answer(false)}>Decline</button>
          </div>
        )}

        {invite.state === 'accepted' ? (
          <a className="btn-primary mt-4 w-full" href={link} target="_blank" rel="noreferrer">Open the poker table</a>
        ) : null}
        {invite.state !== 'declined' ? <p className="mt-4 break-all text-xs text-slate-500">Table link: {link}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>
    </main>
  );
}
