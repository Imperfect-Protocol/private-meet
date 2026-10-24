import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Splash } from '../components/Splash.jsx';
import { ChatWindow } from '../components/table/ChatWindow.jsx';
import { DebugConsole } from '../components/table/DebugConsole.jsx';
import { MediaPrompt } from '../components/table/MediaPrompt.jsx';
import { useMeetSession } from '../hooks/useMeetSession.js';
import { GameKind, gameLabel } from '../lib/meet/games.js';
import { MediaState } from '../lib/meet/MediaSession.js';
import { LinkState } from '../lib/meet/MeetLink.js';
import { ChessTable } from './meet/ChessTable.jsx';
import { PokerTable } from './meet/PokerTable.jsx';

const PROMPT_STATES = new Set([MediaState.Prompt, MediaState.Starting, MediaState.Denied, MediaState.Failed]);

export function MeetPage() {
  const params = useParams();
  const search = useSearchParams();
  const token = search[0].get('k') ?? '';
  const table = useQuery(api.meetings.forTable, token ? { meetingId: params.meetingId, token } : 'skip');
  if (!token) return <Splash label="A personal meeting link is required" />;
  if (!table) return <Splash label="Loading meeting" />;
  if (table.status === 'cancelled' || table.status === 'declined') return <Splash label="This meeting is no longer active" />;
  return <MeetingRoom key={`${params.meetingId}:${token}`} meetingId={params.meetingId} token={token} table={table} />;
}

/** The meeting around the game: header, connection, media prompt, chat and console. */
function MeetingRoom(props) {
  const meet = useMeetSession(props.meetingId, props.token, props.table);
  const [showConsole, setShowConsole] = useState(false);
  if (meet.error) return <main className="grid min-h-screen place-items-center p-6"><p className="text-rose-300">Could not join: {meet.error}</p></main>;
  if (!meet.view) return <Splash label="Preparing table" />;

  const view = meet.view;
  const connected = view.linkState === LinkState.Connected;
  const toggleVideo = view.media.state === MediaState.Live ? () => void meet.session.media.setVideo(!view.media.videoOn) : null;

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-sm text-slate-300">{props.table.title}</h1>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{gameLabel(view.kind)}</span>
        <span className={`text-xs ${connected ? 'text-emerald-300' : 'text-amber-300'}`}>{view.linkState}</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" type="button" onClick={() => meet.session.setChatOpen(!view.chat.isOpen)}>
            Chat {view.chat.unread > 0 ? `(${view.chat.unread})` : ''}
          </button>
          <button className="btn-ghost" type="button" onClick={() => setShowConsole(!showConsole)}>Console</button>
          <a className="btn-ghost" href="/">Leave</a>
        </div>
      </header>

      {view.kind === GameKind.Chess ? (
        <ChessTable game={view.game} session={meet.session.match} names={props.table.names} media={view.media} onToggleVideo={toggleVideo} />
      ) : (
        <PokerTable game={view.game} session={meet.session.match} names={props.table.names} media={view.media} connected={connected} onToggleVideo={toggleVideo} />
      )}
      {view.media.error && view.media.state === MediaState.Live ? <p className="text-center text-sm text-rose-300">{view.media.error}</p> : null}

      {!connected ? (
        <div className="panel fixed bottom-24 left-1/2 z-20 w-[min(26rem,90vw)] -translate-x-1/2 p-5 text-center" role="status">
          <h2 className="font-bold text-white">Waiting for the other player…</h2>
          <p className="mt-2 text-sm text-slate-400">Keep this tab open. We’ll connect when the other person opens their personal meeting link.</p>
        </div>
      ) : null}

      {connected && PROMPT_STATES.has(view.media.state) ? <MediaPrompt media={view.media} onConfirm={(videoOn) => void meet.session.media.confirm(videoOn)} /> : null}
      {view.chat.isOpen ? (
        <ChatWindow
          chat={view.chat}
          names={props.table.names}
          seat={props.table.seat}
          connected={connected}
          onSend={(text) => meet.session.sendChat(text)}
          onClose={() => meet.session.setChatOpen(false)}
        />
      ) : null}
      {showConsole ? <DebugConsole lines={view.consoleLines} onClose={() => setShowConsole(false)} /> : null}
    </main>
  );
}
