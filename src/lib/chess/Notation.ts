import { Bishop, Black, Knight, Queen, Rook, type Board, type Piece, type Square } from './Chess';

/**
 * Algebraic names for the table and the wire. The game itself uses Scala's coordinates:
 * rank 0 is the 8th rank and file 0 is the a-file.
 */
const files = 'abcdefgh';
const promotionsByLetter: ReadonlyMap<string, Piece> = new Map([['Q', Queen], ['R', Rook], ['B', Bishop], ['N', Knight]]);

export const squareName = (square: Square): string => `${files[square[1]]}${8 - square[0]}`;

/** Square named like "e4", or null for anything else. */
export const squareAt = (name: unknown): Square | null =>
  (typeof name === 'string' && /^[a-h][1-8]$/.test(name) ? [8 - Number(name[1]), files.indexOf(name[0])] : null);

/** Piece a Pawn promotes to, by its letter Q, R, B or N; null for anything else. */
export const promotionAt = (letter: unknown): Piece | null =>
  (typeof letter === 'string' ? promotionsByLetter.get(letter) ?? null : null);

/** FEN letters by rank, rank 8 first: upper case for White, lower case for Black, null for vacant squares. */
export const boardLetters = (board: Board): (string | null)[][] =>
  board.map((row) => row.map((square) => {
    if (square === null) return null;
    return square[0] === Black ? square[1].code.toLowerCase() : square[1].code;
  }));
