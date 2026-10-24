const GLYPHS = Object.freeze({ K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' });

/** A chess piece: the solid glyph in the player's color. U+FE0E keeps the pawn from turning into an emoji. */
export function ChessPiece(props) {
  const color = props.white
    ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]'
    : 'text-slate-950 drop-shadow-[0_0_1px_rgba(255,255,255,0.7)]';
  return <span aria-hidden="true" className={`select-none leading-none ${color}`}>{GLYPHS[props.piece]}{'\uFE0E'}</span>;
}
