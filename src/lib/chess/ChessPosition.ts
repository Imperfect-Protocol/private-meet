import { Black, type Board, type Color, type Square, isValidSquare } from './Chess';

/** Algebraic notation is an adapter; the game itself uses Scala's rank/file coordinates. */
export function squareName(square: Square): string {
  return `${'abcdefgh'[square[1]]}${8 - square[0]}`;
}

export function squareCoordinates(value: string): Square | null {
  if (!/^[a-h][1-8]$/.test(value)) return null;
  return [8 - Number(value[1]), value.charCodeAt(0) - 97];
}

export function boardCharacters(board: Board): (string | null)[][] {
  return board.map((row) => row.map((square) => square === null ? null
    : square[0].code === Black.code ? square[1].code.toLowerCase() : square[1].code));
}

/** Canonical position key, including the side to move, for peer-state comparison. */
export function positionKey(board: Board, turn: Color): string {
  return `${board.map((row) => row.map((square) => square === null ? '__' : `${square[0].code}${square[1].code}`).join('')).join('/')}:${turn.code}`;
}

export function isSquare(value: unknown): value is Square {
  return Array.isArray(value) && value.length === 2
    && typeof value[0] === 'number' && typeof value[1] === 'number'
    && isValidSquare(value[0], value[1]);
}
