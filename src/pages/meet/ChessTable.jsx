import { useState } from 'react';
import { ChessBoard } from '../../components/chess/ChessBoard.jsx';
import { ChessMoveList } from '../../components/chess/ChessMoveList.jsx';
import { ChessPlayer } from '../../components/chess/ChessPlayer.jsx';
import { PromotionPicker } from '../../components/chess/PromotionPicker.jsx';
import { CheckMate, FiftyMoves, InsufficientMaterial, Repetition, Stalemate } from '../../lib/chess/Chess.ts';
import { ChessPhase, Resignation } from '../../lib/chess/ChessSession.ts';

const DRAWS = Object.freeze({
  [Stalemate]: 'Draw by stalemate',
  [Repetition]: 'Draw by threefold repetition',
  [FiftyMoves]: 'Draw by the fifty-move rule',
  [InsufficientMaterial]: 'Draw: neither player can checkmate',
  [Resignation]: 'Both players resigned',
});

function statusText(game, names) {
  switch (game.phase) {
    case ChessPhase.Playing:
      return `${game.isMyTurn ? 'Your move' : `${names[game.turn]} to move`}${game.check ? ' · check' : ''}`;
    case ChessPhase.Ended:
      return game.result.winner === null
        ? DRAWS[game.result.reason]
        : `${names[game.result.winner]} wins by ${game.result.reason === CheckMate ? 'checkmate' : 'resignation'}`;
    case ChessPhase.Failed:
      return `Game stopped: ${game.error}.`;
    case ChessPhase.Disconnected:
      return 'Connection lost. The game resumes when you are both back.';
    default:
      return 'Waiting for the other player…';
  }
}

/** Chess at a meeting table: both players, the board and the moves. ChessSession owns the rules. */
export function ChessTable(props) {
  const [selected, setSelected] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const game = props.game;
  const mySeat = game.seat;
  const theirSeat = 1 - mySeat;
  // A selection stands only while that piece has legal moves: the game may have moved on.
  const from = game.legalMoves.some((move) => move.from === selected) ? selected : null;
  const targets = game.legalMoves.filter((move) => move.from === from).map((move) => move.to);

  const choose = (square) => {
    if (from && targets.includes(square)) {
      if (game.legalMoves.some((move) => move.from === from && move.to === square && move.promotion)) setPromotion({ from, to: square });
      else props.session.submitMove({ from, to: square });
      setSelected(null);
      return;
    }
    setSelected(square === from ? null : square);
  };

  const promote = (letter) => {
    props.session.submitMove({ from: promotion.from, to: promotion.to, promotion: letter });
    setPromotion(null);
  };

  const resign = () => {
    if (window.confirm('Resign this game? The call and chat stay open.')) props.session.resign();
  };

  return (
    <section className="mx-auto grid w-full max-w-5xl items-start gap-4 lg:grid-cols-[minmax(0,36rem)_minmax(16rem,1fr)]">
      <div className="flex justify-center gap-8 lg:col-start-2">
        <ChessPlayer
          name={props.names[theirSeat]}
          white={theirSeat === 0}
          stream={props.media.remoteStream}
          active={game.phase === ChessPhase.Playing && game.turn === theirSeat}
        />
        <ChessPlayer
          name={props.names[mySeat]}
          white={mySeat === 0}
          stream={props.media.localStream}
          isMe
          active={game.isMyTurn}
          videoOn={props.media.videoOn}
          onToggleVideo={props.onToggleVideo}
        />
      </div>

      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <ChessBoard
          board={game.board}
          flipped={mySeat === 1}
          enabled={game.isMyTurn}
          selected={from}
          targets={targets}
          lastMove={game.history.at(-1) ?? null}
          check={game.check}
          onSquare={choose}
        />
      </div>

      <aside className="panel flex flex-col gap-4 p-4 lg:col-start-2">
        <p role="status" className="font-semibold text-white">{statusText(game, props.names)}</p>
        <ChessActions game={game} session={props.session} onResign={resign} />
        <div>
          <h2 className="label">Moves</h2>
          <ChessMoveList moves={game.history} />
        </div>
      </aside>

      {promotion && game.isMyTurn ? (
        <PromotionPicker white={mySeat === 0} onChoose={promote} onCancel={() => setPromotion(null)} />
      ) : null}
    </section>
  );
}

/** Resign while playing; ask for a new game once it is over, or answer the other player's request. */
function ChessActions(props) {
  const game = props.game;
  if (game.phase === ChessPhase.Playing) {
    return (
      <div className="flex flex-col gap-2">
        {game.peerWantsRematch ? (
          <>
            <p className="text-sm text-emerald-300">The other player wants to start a new game.</p>
            <button className="btn-primary" type="button" onClick={() => props.session.requestRematch()}>Start a new game</button>
          </>
        ) : null}
        <button className="btn-ghost" type="button" onClick={props.onResign}>Resign</button>
      </div>
    );
  }
  if (game.phase !== ChessPhase.Ended && game.phase !== ChessPhase.Failed) return null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      {game.peerWantsRematch ? <p className="text-emerald-300">The other player wants to play again.</p> : null}
      <button className="btn-primary" type="button" disabled={game.iWantRematch} onClick={() => props.session.requestRematch()}>
        {game.iWantRematch ? 'Waiting for their answer…' : 'Play again'}
      </button>
      <p className="text-xs text-slate-400">Or just keep talking: the call and chat stay open.</p>
    </div>
  );
}
