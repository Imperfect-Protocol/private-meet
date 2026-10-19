import { useState } from 'react';
import { Modal } from '../../components/Modal.jsx';

const PIECE_GLYPH = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

/** Display coordinates follow the Scala board: row zero is Black's back rank. */
export function ChessBoardView(props) {
  const order = Array.from({ length: 8 }, (_unused, index) => index);
  if (props.view.seat === 1) order.reverse();
  const lastMove = props.view.history.at(-1);
  return (
    <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border-8 border-amber-950 shadow-2xl" role="group" aria-label="Chess board">
      {order.flatMap((rank) => order.map((file) => {
        const square = `${'abcdefgh'[file]}${8 - rank}`;
        const piece = props.view.snapshot[rank][file];
        const target = props.targets.includes(square);
        const highlighted = props.selected === square || lastMove?.from === square || lastMove?.to === square;
        return (
          <button
            key={square}
            type="button"
            aria-label={`${square}${piece ? ` ${piece}` : ''}`}
            aria-pressed={props.selected === square}
            disabled={!props.view.isMyTurn}
            onClick={() => props.onSquare(square)}
            className={`relative grid aspect-square place-items-center text-[clamp(1.5rem,6vw,3.2rem)] leading-none ${((rank + file) % 2) === 1 ? 'bg-[#865c3d]' : 'bg-[#e5c8a0]'} ${highlighted ? 'ring-4 ring-inset ring-amber-400' : ''} ${props.view.isMyTurn ? 'cursor-pointer' : ''}`}
          >
            {piece ? <span className={piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_2px_1px_#111]' : 'text-slate-950 drop-shadow-[0_1px_1px_#fff]'}>{PIECE_GLYPH[piece]}</span> : null}
            {target ? <span className="pointer-events-none absolute inset-0 rounded-full border-4 border-rose-500/70" /> : null}
            <span className="absolute bottom-0.5 left-1 text-[9px] font-semibold text-black/60">{square}</span>
          </button>
        );
      }))}
    </div>
  );
}

/** UI dispatches actions; the TypeScript session owns rules, turns and outcomes. */
export function ChessGameView(props) {
  const [selected, setSelected] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const view = props.view;
  const targets = view.isMyTurn && selected
    ? view.legalMoves.filter((move) => move.from === selected).map((move) => move.to) : [];
  const onSquare = (square) => {
    if (!view.isMyTurn) return;
    if (selected && targets.includes(square)) {
      const choices = view.legalMoves.filter((move) => move.from === selected && move.to === square && move.promotion);
      if (choices.length) setPromotion({ from: selected, to: square, match: view.matchNo });
      else props.session.submitMove({ from: selected, to: square });
      setSelected(null);
      return;
    }
    const canMoveFrom = view.legalMoves.some((move) => move.from === square);
    setSelected(canMoveFrom && selected !== square ? square : null);
  };
  const result = view.lastResult;
  const resultText = result
    ? result.winner === null ? (result.reason === 'stalemate' ? 'Stalemate: drawn game' : 'Drawn game')
      : `${props.names[result.winner]} wins by ${result.reason}`
    : null;

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span>{view.phase === 'Playing' ? `${props.names[view.turn]}'s turn` : view.phase}</span>
          <span className="text-amber-200">{view.seat === 0 ? 'You are White' : 'You are Black'}{view.inCheck ? ' · Check' : ''}</span>
        </div>
        <ChessBoardView view={view} selected={selected} targets={targets} onSquare={onSquare} />
        <p className="mt-3 text-xs text-slate-400">Select a piece, then a highlighted square. Castling and en passant are supported. Choose your piece when promoting a pawn. No clock.</p>
      </div>
      <aside className="panel flex flex-col gap-3 p-4">
        <h2 className="font-bold text-white">Moves</h2>
        <ol className="max-h-80 flex-1 space-y-1 overflow-auto text-sm">
          {view.history.map((move) => (
            <li key={`${view.matchNo}:${move.sequence}`} title={`Signed by ${props.names[move.by]} · ${move.digest}`}>
              <span className="text-slate-500">{move.sequence}. </span>
              {move.from} → {move.to} <span className="text-emerald-300" aria-label="Verified signature">✓</span>
            </li>
          ))}
        </ol>
        {view.phase === 'Playing' ? <button className="btn-ghost" type="button" onClick={() => {
          if (window.confirm('Resign this chess game? Your call will stay open.')) props.session.submitResign();
        }}>Resign</button> : null}
        {result ? (
          <div className="space-y-3 rounded-lg bg-amber-400/10 p-3 text-sm">
            <p>{resultText}</p>
            {view.peerWantsRematch ? <p className="text-emerald-300">The other player wants a new game.</p> : null}
            <button className="btn-primary w-full" type="button" disabled={view.iWantRematch} onClick={() => props.session.requestRematch()}>
              {view.iWantRematch ? 'Waiting for their answer…' : 'Play again'}
            </button>
            <p className="text-xs text-slate-400">Or keep talking. The call and chat stay open.</p>
          </div>
        ) : null}
        {view.error ? <p role="alert" className="text-sm text-rose-300">{view.error}</p> : null}
      </aside>
      {promotion && view.isMyTurn && promotion.match === view.matchNo ? (
        <Modal title="Promote your pawn" onClose={() => setPromotion(null)}>
          <div className="flex justify-center gap-3">
            {['q', 'r', 'b', 'n'].map((piece) => (
              <button key={piece} type="button" className="btn-ghost text-3xl" aria-label={{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[piece]}
                onClick={() => { props.session.submitMove({ from: promotion.from, to: promotion.to, promotion: piece }); setPromotion(null); }}>
                {PIECE_GLYPH[view.seat === 0 ? piece.toUpperCase() : piece]}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
