import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Brand, Splash } from '../components/Splash.jsx';
import { Modal } from '../components/Modal.jsx';
import { BetControls } from '../components/table/BetControls.jsx';
import { Card, EmptyCard } from '../components/table/Card.jsx';
import { ChatWindow } from '../components/table/ChatWindow.jsx';
import { DebugConsole } from '../components/table/DebugConsole.jsx';
import { MediaPrompt } from '../components/table/MediaPrompt.jsx';
import { Seat } from '../components/table/Seat.jsx';
import { Avatar } from '../components/table/Avatar.jsx';
import { useMeetSession } from '../hooks/useMeetSession.js';
import { ChessGameView } from '../lib/chess/ChessSessionView.jsx';
import { MatchPhase } from '../lib/meet/HeadsUpMatch.js';
import { MediaState } from '../lib/meet/MediaSession.js';
import { LinkState } from '../lib/meet/MeetLink.js';

const PROMPT_STATES = new Set([MediaState.Prompt, MediaState.Starting, MediaState.Denied, MediaState.Failed]);

export function MeetPage() {
  const params = useParams();
  const search = useSearchParams();
  const token = search[0].get('k') ?? '';
  const table = useQuery(api.meetings.forTable, token ? { meetingId: params.meetingId, token } : 'skip');
  if (!token) return <Splash label="A personal meeting link is required" />;
  if (!table) return <Splash label="Loading meeting" />;
  if (table.status === 'cancelled' || table.status === 'declined') return <Splash label="This meeting is no longer active" />;
  return <MeetingTable key={`${params.meetingId}:${token}`} meetingId={params.meetingId} token={token} table={table} />;
}

function MeetingTable(props) {
  const meet = useMeetSession(props.meetingId, props.token, props.table);
  const [showConsole, setShowConsole] = useState(false);
  const [dismissedRematch, setDismissedRematch] = useState('');
  if (meet.error) return <main className="grid min-h-screen place-items-center p-6"><p className="text-rose-300">Could not join: {meet.error}</p></main>;
  if (!meet.view) return <Splash label="Preparing table" />;

  const view = meet.view;
  const game = view.game;
  const mySeat = game?.seat ?? 0;
  const otherSeat = 1 - mySeat;
  const connected = view.linkState === LinkState.Connected;
  const gameLabel = view.kind === 'chess' ? 'Chess' : 'Poker';

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <Brand />
        <h1 className="text-sm text-slate-300">{props.table.title}</h1>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{gameLabel}</span>
        <span className={`text-xs ${connected ? 'text-emerald-300' : 'text-amber-300'}`}>{view.linkState}</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" type="button" onClick={() => meet.session.setChatOpen(!view.chat.isOpen)}>
            Chat {view.chat.unread > 0 ? `(${view.chat.unread})` : ''}
          </button>
          <button className="btn-ghost" type="button" onClick={() => setShowConsole(!showConsole)}>Console</button>
          <a className="btn-ghost" href="/">Leave</a>
        </div>
      </header>

      {view.kind === 'chess' ? (
        <>
          <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar name={props.table.names[mySeat]} stream={view.media.localStream} isMe
                videoOn={view.media.videoOn} isActive={game.isMyTurn}
                onToggleVideo={view.media.state === MediaState.Live ? () => void meet.session.media.setVideo(!view.media.videoOn) : null} />
              <span className="text-sm">{props.table.names[mySeat]} (you)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar name={props.table.names[otherSeat]} stream={view.media.remoteStream} isActive={game.turn === otherSeat && connected} />
              <span className="text-sm">{props.table.names[otherSeat]}</span>
            </div>
          </div>
          <ChessGameView view={game} session={meet.session.match} names={props.table.names} />
        </>
      ) : (
        <PokerTable game={game} mySeat={mySeat} otherSeat={otherSeat} table={props.table} media={view.media}
          onToggleVideo={() => void meet.session.media.setVideo(!view.media.videoOn)} />
      )}

      {view.kind === 'poker' ? (
        <footer className="mx-auto w-full max-w-4xl rounded-xl bg-slate-900/80 p-4">
          <BetControls options={connected ? game.betOptions : null} onBet={(amount) => meet.session.match.bet(amount)} />
          {view.media.error && view.media.state === MediaState.Live ? <p className="mt-2 text-center text-sm text-rose-300">{view.media.error}</p> : null}
        </footer>
      ) : null}

      {!connected ? (
        <div className="panel fixed bottom-24 left-1/2 z-20 w-[min(26rem,90vw)] -translate-x-1/2 p-5 text-center" role="status">
          <h2 className="font-bold text-white">Waiting for the other player…</h2>
          <p className="mt-2 text-sm text-slate-400">Keep this tab open. We’ll connect when the other person opens their personal meeting link.</p>
          {meet.error ? <p className="mt-2 text-sm text-rose-300">{meet.error}</p> : null}
        </div>
      ) : null}

      {connected && PROMPT_STATES.has(view.media.state) ? <MediaPrompt media={view.media} onConfirm={(videoOn) => void meet.session.media.confirm(videoOn)} /> : null}
      {view.kind === 'poker' && game.phase === MatchPhase.MatchOver && dismissedRematch !== `${game.matchNo}:${game.handNo}` ? <PokerRematchModal game={game} onPlay={() => meet.session.match.vote(true)} onSkip={() => { meet.session.match.vote(false); setDismissedRematch(`${game.matchNo}:${game.handNo}`); }} /> : null}
      {view.kind === 'poker' && game.phase === MatchPhase.Failed ? (
        <div className="panel mx-auto max-w-xl p-4 text-sm text-rose-300">Game stopped: {game.error}. You can keep talking or reload both tabs to start a fresh game.</div>
      ) : null}
      {view.chat.isOpen ? <ChatWindow chat={view.chat} names={props.table.names} seat={mySeat} connected={connected} onSend={(text) => meet.session.sendChat(text)} onClose={() => meet.session.setChatOpen(false)} /> : null}
      {showConsole ? <DebugConsole lines={view.consoleLines} onClose={() => setShowConsole(false)} /> : null}
    </main>
  );
}

function PokerTable(props) {
  const game = props.game;
  const mySeat = props.mySeat;
  const otherSeat = props.otherSeat;
  const table = props.table;
  const media = props.media;
  const resultVisible = game.phase === MatchPhase.HandResult || game.phase === MatchPhase.MatchOver;
  const ownCards = game.myCards.length ? game.myCards : [null, null];
  const otherCards = resultVisible ? game.lastResult?.cards[otherSeat] ?? [null, null] : [null, null];
  const resultText = resultVisible && game.lastResult
    ? game.lastResult.winners.length === 2
      ? 'Split pot'
      : `${table.names[game.lastResult.winners[0]]} wins ${game.lastResult.pot} chips`
    : game.stateLabel || 'Waiting for both players';
  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-[3rem] border-[10px] border-[#384451] bg-emerald-950 px-4 py-6 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/table.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="relative">
        <Seat
          name={table.names[otherSeat]} stack={game.stacks[otherSeat]} bet={game.bets[otherSeat]} cards={otherCards}
          top isTurn={game.turn === otherSeat} isDealer={game.dealer === otherSeat}
          isWinner={resultVisible && game.lastResult?.winners.includes(otherSeat)} isFolded={game.folded[otherSeat]}
          stream={media.remoteStream}
        />
      </div>
      <section className="relative flex flex-col items-center gap-3 py-3 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/60">Play chips only · blinds 10 / 20</p>
        <p className="font-bold text-amber-200">Pot {game.pot}</p>
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_unused, index) => game.community[index]
            ? <Card key={index} card={game.community[index]} />
            : <EmptyCard key={index} />)}
        </div>
        <p className="max-w-sm text-sm text-white">{resultText}</p>
        <p className="text-xs text-emerald-100/50">Hand {game.handNo || '—'}</p>
      </section>
      <div className="relative">
        <Seat
          name={table.names[mySeat]} stack={game.stacks[mySeat]} bet={game.bets[mySeat]} cards={ownCards}
          isMe isTurn={game.turn === mySeat} isDealer={game.dealer === mySeat}
          isWinner={resultVisible && game.lastResult?.winners.includes(mySeat)} isFolded={game.folded[mySeat]}
          stream={media.localStream} videoOn={media.videoOn}
          onToggleVideo={media.state === MediaState.Live ? props.onToggleVideo : null}
        />
      </div>
    </div>
  );
}

function PokerRematchModal({ game, onPlay, onSkip }) {
  return (
    <Modal title="Play again?">
      <p className="text-sm text-slate-400">One player has run out of chips. Start again with 1000 each? Your call and chat can stay open either way.</p>
      {game.peerWantsRematch ? <p className="mt-3 text-sm text-emerald-300">The other player wants to play again.</p> : null}
      {game.peerDeclined ? <p className="mt-3 text-sm text-slate-400">The other player chose to keep chatting.</p> : null}
      <div className="mt-5 flex gap-2">
        <button className="btn-primary flex-1" type="button" disabled={game.iWantRematch} onClick={onPlay}>{game.iWantRematch ? 'Waiting for their answer…' : 'Yes, play again'}</button>
        <button className="btn-ghost flex-1" type="button" onClick={onSkip}>Just chat</button>
      </div>
    </Modal>
  );
}
