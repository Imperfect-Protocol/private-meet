import { useEffect, useState, useSyncExternalStore } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MeetSession } from '../lib/meet/MeetSession.js';

const noSubscription = () => () => {};
const noView = () => null;

/** Connects a MeetSession to React and Convex. Protocol behaviour lives in MeetSession. */
export function useMeetSession(meetingId, token, table) {
  const announcePeer = useMutation(api.meetings.announcePeer);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const seat = table?.seat;
  const peerAddress = table?.peer?.peerAddress;
  const publicKey = table?.peer?.publicKey;

  useEffect(() => {
    if (seat === undefined) return undefined;
    const next = new MeetSession({ meetingId, seat });
    let cancelled = false;
    setError('');
    announcePeer({ token, ...next.announcement() })
      .then(() => { if (!cancelled) setSession(next); })
      .catch((reason) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; next.close(); };
  }, [meetingId, token, seat, announcePeer]);

  useEffect(() => {
    if (session && peerAddress && publicKey) session.setPeer({ peerAddress, publicKey });
  }, [session, peerAddress, publicKey]);

  const view = useSyncExternalStore(
    session ? (listener) => session.subscribe(listener) : noSubscription,
    session ? () => session.view() : noView,
  );

  return { session, view, error };
}
