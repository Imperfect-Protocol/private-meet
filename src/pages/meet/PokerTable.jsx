import { useState } from 'react';
import { Modal } from '../../components/Modal.jsx';
import { BetControls } from '../../components/table/BetControls.jsx';
import { Card, EmptyCard } from '../../components/table/Card.jsx';
import { Seat } from '../../components/table/Seat.jsx';
import { MatchPhase } from '../../lib/meet/HeadsUpMatch.js';

/** Heads-up poker at a meeting table: both seats, the board, bet controls and the rematch question. */
export function PokerTable(props) {
  const [dismissedRematch, setDismissedRematch] = useState('');
  const game = props.game;
  const names = props.names;
  const media = props.media;
  const mySeat = game.seat;
  const otherSeat = 1 - mySeat;
  const resultVisible = game.phase === MatchPhase.HandResult || game.phase === MatchPhase.MatchOver;
  const ownCards = game.myCards.length ? game.myCards : [null, null];
  const otherCards = resultVisible ? game.lastResult?.cards[otherSeat] ?? [null, null] : [null, null];
  const resultText = resultVisible && game.lastResult
    ? game.lastResult.winners.length === 2
      ? 'Split pot'
      : `${names[game.lastResult.winners[0]]} wins ${game.lastResult.pot} chips`
    : game.stateLabel || 'Waiting for both players';
  const rematchKey = `${game.matchNo}:${game.handNo}`;

  return (
    <>
      <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-[3rem] border-[10px] border-[#384451] bg-emerald-950 px-4 py-6 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/table.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative">
          <Seat
            name={names[otherSeat]} stack={game.stacks[otherSeat]} bet={game.bets[otherSeat]} cards={otherCards}
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
            name={names[mySeat]} stack={game.stacks[mySeat]} bet={game.bets[mySeat]} cards={ownCards}
            isMe isTurn={game.turn === mySeat} isDealer={game.dealer === mySeat}
            isWinner={resultVisible && game.lastResult?.winners.includes(mySeat)} isFolded={game.folded[mySeat]}
            stream={media.localStream} videoOn={media.videoOn}
            onToggleVideo={props.onToggleVideo}
          />
        </div>
      </div>

      <footer className="mx-auto w-full max-w-4xl rounded-xl bg-slate-900/80 p-4">
        <BetControls options={props.connected ? game.betOptions : null} onBet={(amount) => props.session.bet(amount)} />
      </footer>

      {game.phase === MatchPhase.MatchOver && dismissedRematch !== rematchKey ? (
        <PokerRematchModal
          game={game}
          onPlay={() => props.session.vote(true)}
          onSkip={() => { props.session.vote(false); setDismissedRematch(rematchKey); }}
        />
      ) : null}
      {game.phase === MatchPhase.Failed ? (
        <div className="panel mx-auto max-w-xl p-4 text-sm text-rose-300">Game stopped: {game.error}. You can keep talking or reload both tabs to start a fresh game.</div>
      ) : null}
    </>
  );
}

function PokerRematchModal(props) {
  return (
    <Modal title="Play again?">
      <p className="text-sm text-slate-400">One player has run out of chips. Start again with 1000 each? Your call and chat can stay open either way.</p>
      {props.game.peerWantsRematch ? <p className="mt-3 text-sm text-emerald-300">The other player wants to play again.</p> : null}
      {props.game.peerDeclined ? <p className="mt-3 text-sm text-slate-400">The other player chose to keep chatting.</p> : null}
      <div className="mt-5 flex gap-2">
        <button className="btn-primary flex-1" type="button" disabled={props.game.iWantRematch} onClick={props.onPlay}>
          {props.game.iWantRematch ? 'Waiting for their answer…' : 'Yes, play again'}
        </button>
        <button className="btn-ghost flex-1" type="button" onClick={props.onSkip}>Just chat</button>
      </div>
    </Modal>
  );
}
