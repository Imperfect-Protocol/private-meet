import { ChessPiece } from './ChessPiece.jsx';

const FILES = 'abcdefgh';
const INDICES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]);
const FLIPPED = Object.freeze([7, 6, 5, 4, 3, 2, 1, 0]);
const PIECE_NAMES = Object.freeze({ K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' });

/**
 * The board as the view gives it, rank 8 first; Black sees it turned around.
 * Squares are buttons while it is the player's turn.
 */
export function ChessBoard(props) {
  const order = props.flipped ? FLIPPED : INDICES;
  return (
    <div role="group" aria-label="Chess board" className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border-4 border-amber-950 shadow-2xl">
      {order.flatMap((row) => order.map((column) => {
        const square = `${FILES[column]}${8 - row}`;
        const letter = props.board[row][column];
        const piece = letter?.toUpperCase();
        const white = letter !== null && letter === piece;
        const dark = (row + column) % 2 === 1;
        const moved = props.lastMove !== null && (props.lastMove.from === square || props.lastMove.to === square);
        const background = square === props.check ? 'bg-rose-500'
          : square === props.selected ? 'bg-amber-300'
            : moved ? (dark ? 'bg-amber-600' : 'bg-amber-200')
              : dark ? 'bg-[#8b5e3c]' : 'bg-[#ecd6b0]';
        const coordinate = dark ? 'text-[#ecd6b0]' : 'text-[#8b5e3c]';
        return (
          <button
            key={square}
            type="button"
            disabled={!props.enabled}
            aria-pressed={square === props.selected}
            aria-label={letter ? `${square}, ${white ? 'white' : 'black'} ${PIECE_NAMES[piece]}` : square}
            onClick={() => props.onSquare(square)}
            className={`relative grid aspect-square place-items-center text-[clamp(1.75rem,7vw,3.25rem)] ${background} ${props.enabled ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {letter ? <ChessPiece piece={piece} white={white} /> : null}
            {props.targets.includes(square) ? (
              <span className={`pointer-events-none absolute rounded-full ${letter ? 'inset-1 border-4 border-rose-500/70' : 'h-1/4 w-1/4 bg-rose-500/60'}`} />
            ) : null}
            {column === order[0] ? <span className={`absolute left-0.5 top-0 text-[10px] font-bold ${coordinate}`}>{8 - row}</span> : null}
            {row === order[7] ? <span className={`absolute bottom-0 right-1 text-[10px] font-bold ${coordinate}`}>{FILES[column]}</span> : null}
          </button>
        );
      }))}
    </div>
  );
}
