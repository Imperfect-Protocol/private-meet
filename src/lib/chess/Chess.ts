/*
 * SCALA CHESS, in TypeScript
 *
 * Ported from scala-games/Chess/src/Chess.scala.
 * Author: Sonia Sadhbh Kolasinska <sonia.kolasinska.pro@gmail.com>
 *
 * LICENSE
 *
 * The MIT License (MIT) Copyright (c) 2023, Sonia Sadhbh Kolasinska
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * The structure follows the Scala package object: pieces, colors, outcomes and invalid moves are
 * values, the rules are small curried functions over an immutable 8 x 8 board, and Game keeps the
 * history. Rank 0 is Black's back rank and rank 7 is White's. Move vectors are relative to the
 * moving color: (1, 0) is one square forward for both players.
 *
 * The rules are complete where the Scala reference stopped short: no move may leave the mover's
 * King in check, Kings never stand side by side, sliding pieces move in straight lines only,
 * checkmate looks at every reply, and castling, en passant, the choice of promotion, stalemate and
 * draws are played. Castling and en passant depend on earlier moves, so the functions that need
 * them take the game's History instead of one Board.
 */

export type MoveVector = readonly [number, number];
export type Square = readonly [rank: number, file: number];

/** A piece moves by exactly its vectors (FixedRange), or any distance along them (VariableRange). */
export const FixedRange = 'FixedRange';
export const VariableRange = 'VariableRange';
export type MoveRange = typeof FixedRange | typeof VariableRange;

/** Outcome of a move, for the player who moves next. */
export const NextPlayer = 'NextPlayer';
export const Check = 'Check';
export const CheckMate = 'CheckMate';
export const Stalemate = 'Stalemate';
export const Repetition = 'Repetition';
export const FiftyMoves = 'FiftyMoves';
export const InsufficientMaterial = 'InsufficientMaterial';
export type Outcome =
  | typeof NextPlayer | typeof Check | typeof CheckMate
  | typeof Stalemate | typeof Repetition | typeof FiftyMoves | typeof InsufficientMaterial;

/** Piece in the game of Chess */
export interface Piece {
  readonly code: string;
  readonly moveRange: MoveRange;
  readonly validMoves: readonly MoveVector[];
}

const diagonals: readonly MoveVector[] = [[1, -1], [1, 1], [-1, -1], [-1, 1]];
const straights: readonly MoveVector[] = [[1, 0], [0, -1], [0, 1], [-1, 0]];

export const King: Piece = { code: 'K', moveRange: FixedRange, validMoves: [...diagonals, ...straights] };
export const Queen: Piece = { code: 'Q', moveRange: VariableRange, validMoves: [...diagonals, ...straights] };
export const Rook: Piece = { code: 'R', moveRange: VariableRange, validMoves: straights };
export const Bishop: Piece = { code: 'B', moveRange: VariableRange, validMoves: diagonals };
export const Knight: Piece = {
  code: 'N',
  moveRange: FixedRange,
  validMoves: [[2, -1], [2, 1], [-2, -1], [-2, 1], [1, -2], [1, 2], [-1, -2], [-1, 2]],
};
/** Pawns move one square forward, two from their initial rank, and kill diagonally forward. */
export const Pawn: Piece & { readonly validKillMoves: readonly MoveVector[] } = {
  code: 'P',
  moveRange: FixedRange,
  validMoves: [[1, 0]],
  validKillMoves: [[1, -1], [1, 1]],
};

/** Pieces a Pawn may promote to */
export const promotions: readonly Piece[] = [Queen, Rook, Bishop, Knight];

/** Color of the player's pieces */
export interface Color {
  readonly code: string;
  readonly initialRanks: readonly [pieces: number, pawns: number];
}
export const White: Color = { code: '1', initialRanks: [7, 6] };
export const Black: Color = { code: '2', initialRanks: [0, 1] };

/** Invalid move: any move that is invalid will result in one of these statuses */
export const NoPlayerTurn = 'NoPlayerTurn';
export const NoPiece = 'NoPiece';
export const InvalidLocation = 'InvalidLocation';
export const AlreadyOccupied = 'AlreadyOccupied';
export const NoMove = 'NoMove';
export const NoPawnMove = 'NoPawnMove';
export const MoveBlocked = 'MoveBlocked';
export const NoCastling = 'NoCastling';
export const KingInCheck = 'KingInCheck';
export const GameOver = 'GameOver';
export type InvalidMove =
  | typeof NoPlayerTurn | typeof NoPiece | typeof InvalidLocation | typeof AlreadyOccupied | typeof NoMove
  | typeof NoPawnMove | typeof MoveBlocked | typeof NoCastling | typeof KingInCheck | typeof GameOver;

/** Piece of given color; null is a vacant square (Scala's Option). */
export type ColorPiece = readonly [color: Color, piece: Piece];
export type MaybeColorPiece = ColorPiece | null;
export type Board = readonly (readonly MaybeColorPiece[])[];
/** Every board of the game, oldest first; the last one is on the table. */
export type History = readonly Board[];
/** Scala's Either[Board, InvalidMove]: the board after the move, or why the move is invalid. */
export type MoveResult = Board | InvalidMove;

export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: Piece;
}

export const isInvalid = (result: MoveResult): result is InvalidMove => typeof result === 'string';

/** Scala's `0 to 7` */
const range: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];
const squares: readonly Square[] = range.flatMap((rank) => range.map((file): Square => [rank, file]));
const recent = (history: History): Board => history[history.length - 1];
const contains = (vectors: readonly MoveVector[], mv: MoveVector): boolean =>
  vectors.some((vector) => vector[0] === mv[0] && vector[1] === mv[1]);
/** Scala's `square == Some((color, piece))` */
const holds = (color: Color, piece: Piece) => (square: MaybeColorPiece): boolean =>
  square !== null && square[0] === color && square[1] === piece;

/**
 * Piece moving vector
 *
 * A vector describing move of the piece in the context of the color of the piece, e.g. moving a
 * Pawn forward by one square is always (1, 0), even though a White Pawn actually moves (-1, 0).
 */
export const moveVector = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color): MoveVector =>
    color === Black ? [toRank - fromRank, toFile - fromFile] : [fromRank - toRank, fromFile - toFile];

/** Direction vector: a unit vector telling direction of the vector */
export const normalizeVector = (mv: MoveVector): MoveVector => [Math.sign(mv[0]), Math.sign(mv[1])];

export const oppositeColor = (color: Color): Color => (color === White ? Black : White);

/** Check that square coordinates lie in the space of 8 x 8 board */
export function isValidSquare(pos: Square): boolean;
export function isValidSquare(rank: number, file: number): boolean;
export function isValidSquare(rankOrPos: number | Square, file = -1): boolean {
  return typeof rankOrPos === 'number'
    ? range.includes(rankOrPos) && range.includes(file)
    : isValidSquare(rankOrPos[0], rankOrPos[1]);
}

/** Check that square is not occupied by any piece */
export const isSquareVacant = (board: Board) => (pos: Square): boolean => board[pos[0]][pos[1]] === null;

/** Check that square is occupied by a piece of given player (color) */
export const isOccupied = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  board[rank][file]?.[0] === color;

/** Calculate square coordinates by adding move vector */
export const nextSquare = (rank: number, file: number) => (color: Color) => (mv: MoveVector): Square =>
  color === Black ? [rank + mv[0], file + mv[1]] : [rank - mv[0], file - mv[1]];

/** Calculate new vector by adding move vector */
export const nextVector = (vector: MoveVector) => (mv: MoveVector): MoveVector => [vector[0] + mv[0], vector[1] + mv[1]];

/** Calculate distance vector: distance from -> to is calculated as (to - from) */
export const distanceVector = (fromRank: number, fromFile: number) => (toRank: number, toFile: number): MoveVector =>
  [toRank - fromRank, toFile - fromFile];

/** Generate list of square coordinates in straight line between two squares, both included */
export const createPath = (fromRank: number, fromFile: number) => (toRank: number, toFile: number): Square[] => {
  // we build the path backwards, from `to` towards `from`
  const increment = normalizeVector(distanceVector(toRank, toFile)(fromRank, fromFile));
  const steps = Math.max(Math.abs(toRank - fromRank), Math.abs(toFile - fromFile));
  return Array.from({ length: steps }).reduce<Square[]>((path) => [nextVector(path[0])(increment), ...path], [[toRank, toFile]]);
};

/** Check that path between two squares in the straight line is blocked by any piece */
export const isPathBlocked = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) => (board: Board): boolean =>
  createPath(fromRank, fromFile)(toRank, toFile).slice(1, -1).some((pos) => !isSquareVacant(board)(pos));

/** Find the nearest piece in the straight line from a square in given direction */
export const findPathBlocker = (fromRank: number, fromFile: number) => (color: Color) => (mv: MoveVector) =>
  (board: Board): readonly [ColorPiece, Square] | null => {
    const toPos = nextSquare(fromRank, fromFile)(color)([mv[0] * 7, mv[1] * 7]);
    const blocker = createPath(fromRank, fromFile)(toPos[0], toPos[1]).slice(1)
      .filter((pos) => isValidSquare(pos))
      .find((pos) => !isSquareVacant(board)(pos));
    return blocker ? [board[blocker[0]][blocker[1]] as ColorPiece, blocker] : null;
  };

/** Check that opponent's piece of fixed range stands one of the vectors away */
const isFixedRangeCheckAt = (attacker: Piece, vectors: readonly MoveVector[]) => (rank: number, file: number) =>
  (color: Color) => (board: Board): boolean =>
    vectors.map(nextSquare(rank, file)(color))
      .filter((pos) => isValidSquare(pos))
      .some((pos) => holds(oppositeColor(color), attacker)(board[pos[0]][pos[1]]));

/** Check that opponent's Knight is producing check */
export const isKnightCheckAt = isFixedRangeCheckAt(Knight, Knight.validMoves);

/** Check that opponent's Pawn is producing check */
export const isPawnCheckAt = isFixedRangeCheckAt(Pawn, Pawn.validKillMoves);

/** Check that opponent's King stands next to the square (Scala let the Kings stand side by side) */
export const isKingCheckAt = isFixedRangeCheckAt(King, King.validMoves);

/** Check that opponent's piece with a variable range of moves is producing check */
export const isVariableRangeCheckAt = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  Queen.validMoves.some((mv) => {
    const occupier = findPathBlocker(rank, file)(color)(mv)(board);
    return occupier !== null
      && occupier[0][0] === oppositeColor(color)
      && occupier[0][1].moveRange === VariableRange
      && contains(occupier[0][1].validMoves, mv);
  });

/** Check that for our King at given square coordinates there exists opponent's piece producing check */
export const isCheckAt = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  isKnightCheckAt(rank, file)(color)(board)
  || isPawnCheckAt(rank, file)(color)(board)
  || isVariableRangeCheckAt(rank, file)(color)(board)
  || isKingCheckAt(rank, file)(color)(board);

/** Square where our King stands */
export const kingSquare = (color: Color) => (board: Board): Square =>
  squares.find((pos) => holds(color, King)(board[pos[0]][pos[1]])) as Square;

/** Check that our King observes check where it stands */
export const isKingInCheck = (color: Color) => (board: Board): boolean => {
  const king = kingSquare(color)(board);
  return isCheckAt(king[0], king[1])(color)(board);
};

/** Move a piece: it leaves its square, and kills opponent's piece on the target square */
export const movePieceValid = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): Board =>
    board.map((row, rank) => row.map((square, file) => {
      if (rank === fromRank && file === fromFile) return null;
      if (rank === toRank && file === toFile) return [color, piece] as const;
      return square;
    }));

/** Move a Pawn with validation. On the last rank it promotes, to a Queen unless told otherwise */
export const movePawn = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, promotion: Piece = Queen) => (board: Board): MoveResult => {
    const lastRank = toRank === 0 || toRank === 7;
    if (lastRank && !promotions.includes(promotion)) return NoPawnMove;
    const move = movePieceValid(fromRank, fromFile)(toRank, toFile)(color, lastRank ? promotion : Pawn);
    switch (String(moveVector(fromRank, fromFile)(toRank, toFile)(color))) {
      // move 1 up, onto a vacant square
      case '1,0':
        return isSquareVacant(board)([toRank, toFile]) ? move(board) : MoveBlocked;
      // move 2 up in first move, over and onto vacant squares (Scala let it land on a piece)
      case '2,0':
        if (fromRank !== color.initialRanks[1]) return NoPawnMove;
        return isSquareVacant(board)([toRank, toFile]) && !isPathBlocked(fromRank, fromFile)(toRank, toFile)(board)
          ? move(board)
          : MoveBlocked;
      // kill opponent on 1-up-diagonal \ or /
      case '1,-1':
      case '1,1':
        return isOccupied(toRank, toFile)(oppositeColor(color))(board) ? move(board) : NoPawnMove;
      default:
        return NoMove;
    }
  };

/** Move piece with fixed range of valid moves */
export const movePieceFixed = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): MoveResult =>
    contains(piece.validMoves, moveVector(fromRank, fromFile)(toRank, toFile)(color))
      ? movePieceValid(fromRank, fromFile)(toRank, toFile)(color, piece)(board)
      : NoMove;

/** Move piece with variable range of valid moves, along a straight line (Scala took any vector of the right signs) */
export const movePieceVariable = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): MoveResult => {
    const mv = moveVector(fromRank, fromFile)(toRank, toFile)(color);
    const straight = mv[0] === 0 || mv[1] === 0 || Math.abs(mv[0]) === Math.abs(mv[1]);
    if (!straight || !contains(piece.validMoves, normalizeVector(mv))) return NoMove;
    if (isPathBlocked(fromRank, fromFile)(toRank, toFile)(board)) return MoveBlocked;
    return movePieceValid(fromRank, fromFile)(toRank, toFile)(color, piece)(board);
  };

/** Move piece with full validation */
export const movePiece = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece, promotion: Piece = Queen) => (board: Board): MoveResult => {
    if (!isValidSquare(fromRank, fromFile) || !isValidSquare(toRank, toFile)) return InvalidLocation;
    if (isOccupied(toRank, toFile)(color)(board)) return AlreadyOccupied;
    if (piece === Pawn) return movePawn(fromRank, fromFile)(toRank, toFile)(color, promotion)(board);
    return piece.moveRange === FixedRange
      ? movePieceFixed(fromRank, fromFile)(toRank, toFile)(color, piece)(board)
      : movePieceVariable(fromRank, fromFile)(toRank, toFile)(color, piece)(board);
  };

/** pieces(4) is the King; castling sides by the file the King lands on, with the Rook's file before and after */
const kingFile = 4;
const castlings = [
  { king: 6, rook: 7, rookTo: 5 },
  { king: 2, rook: 0, rookTo: 3 },
] as const;

/** Castling right: neither our King nor that Rook has left its initial square during the game */
export const canCastle = (color: Color, rookFile: number) => (history: History): boolean =>
  history.every((board) => holds(color, King)(board[color.initialRanks[0]][kingFile])
    && holds(color, Rook)(board[color.initialRanks[0]][rookFile]));

/** Castle with validation: the right is kept, the way to the Rook is free, and the King never stands in check on its way */
export const moveCastling = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color) => (history: History): MoveResult => {
    const home = color.initialRanks[0];
    const side = castlings.find((castling) => castling.king === toFile);
    if (!side || fromRank !== home || fromFile !== kingFile || toRank !== home) return NoMove;
    if (!canCastle(color, side.rook)(history)) return NoCastling;
    const board = recent(history);
    if (isPathBlocked(home, kingFile)(home, side.rook)(board)) return MoveBlocked;
    if (createPath(home, kingFile)(home, side.king).some((pos) => isCheckAt(pos[0], pos[1])(color)(board))) return KingInCheck;
    return movePieceValid(home, side.rook)(home, side.rookTo)(color, Rook)(
      movePieceValid(home, kingFile)(home, side.king)(color, King)(board));
  };

/** En passant with validation: the opponent's Pawn has just moved two squares, over the target square */
export const moveEnPassant = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color) => (history: History): MoveResult => {
    const board = recent(history);
    const before = history.at(-2);
    const opponent = oppositeColor(color);
    const start = nextSquare(fromRank, toFile)(color)([2, 0]);
    const jumped = before !== undefined && isValidSquare(start)
      && holds(opponent, Pawn)(board[fromRank][toFile]) && before[fromRank][toFile] === null
      && holds(opponent, Pawn)(before[start[0]][start[1]]) && board[start[0]][start[1]] === null;
    if (!jumped || !contains(Pawn.validKillMoves, moveVector(fromRank, fromFile)(toRank, toFile)(color))) return NoPawnMove;
    // kill sideways, then step forward
    return movePieceValid(fromRank, toFile)(toRank, toFile)(color, Pawn)(
      movePieceValid(fromRank, fromFile)(fromRank, toFile)(color, Pawn)(board));
  };

/**
 * Make player move with full validation
 *
 * Validate that it is player's piece that we move, move it with further validation, and refuse a
 * move that leaves the player's King in check.
 */
export const makeMove = (fromRank: number, fromFile: number) => (toRank: number, toFile: number, promotion: Piece = Queen) =>
  (color: Color) => (history: History): MoveResult => {
    if (!isValidSquare(fromRank, fromFile) || !isValidSquare(toRank, toFile)) return InvalidLocation;
    const board = recent(history);
    const square = board[fromRank][fromFile];
    if (square === null) return NoPiece;
    if (square[0] !== color) return NoPlayerTurn;
    const castling = square[1] === King && fromRank === toRank && Math.abs(toFile - fromFile) === 2;
    const enPassant = square[1] === Pawn && fromFile !== toFile && isSquareVacant(board)([toRank, toFile]);
    const result = castling ? moveCastling(fromRank, fromFile)(toRank, toFile)(color)(history)
      : enPassant ? moveEnPassant(fromRank, fromFile)(toRank, toFile)(color)(history)
        : movePiece(fromRank, fromFile)(toRank, toFile)(color, square[1], promotion)(board);
    return isInvalid(result) || !isKingInCheck(color)(result) ? result : KingInCheck;
  };

const pawnVectors: readonly MoveVector[] = [...Pawn.validMoves, [2, 0], ...Pawn.validKillMoves];
const kingVectors: readonly MoveVector[] = [...King.validMoves, [0, 2], [0, -2]];

/** Squares a piece could reach by its vectors before validation: any distance for variable range pieces */
const reach = (rank: number, file: number) => (color: Color, piece: Piece): Square[] => {
  const vectors = piece === Pawn ? pawnVectors
    : piece === King ? kingVectors
      : piece.moveRange === FixedRange ? piece.validMoves
        : piece.validMoves.flatMap((mv) => range.slice(1).map((step): MoveVector => [mv[0] * step, mv[1] * step]));
  return vectors.map(nextSquare(rank, file)(color)).filter((pos) => isValidSquare(pos));
};

/** Every legal move of given color. A Pawn reaching the last rank makes one move per promotion */
export const legalMoves = (color: Color) => (history: History): Move[] => {
  const board = recent(history);
  return squares.filter((from) => isOccupied(from[0], from[1])(color)(board)).flatMap((from) => {
    const piece = (board[from[0]][from[1]] as ColorPiece)[1];
    return reach(from[0], from[1])(color, piece)
      .filter((to) => !isInvalid(makeMove(from[0], from[1])(to[0], to[1])(color)(history)))
      .flatMap((to): Move[] => (piece === Pawn && (to[0] === 0 || to[0] === 7)
        ? promotions.map((promotion) => ({ from, to, promotion }))
        : [{ from, to }]));
  });
};

/** Neither player can ever checkmate: Kings alone, with one Knight or Bishop, or with Bishops on squares of one color */
export const isInsufficientMaterial = (board: Board): boolean => {
  const others = squares.filter((pos) => board[pos[0]][pos[1]] !== null && board[pos[0]][pos[1]]?.[1] !== King);
  const piece = (pos: Square): Piece => (board[pos[0]][pos[1]] as ColorPiece)[1];
  return others.length === 0
    || (others.length === 1 && (piece(others[0]) === Knight || piece(others[0]) === Bishop))
    || (others.every((pos) => piece(pos) === Bishop) && new Set(others.map((pos) => (pos[0] + pos[1]) % 2)).size === 1);
};

/** Number of pieces and the Pawns' squares: every kill and every Pawn move changes it for good */
const material = (board: Board): string => {
  const occupied = squares.filter((pos) => board[pos[0]][pos[1]] !== null);
  const pawns = occupied.filter((pos) => board[pos[0]][pos[1]]?.[1] === Pawn)
    .map((pos) => `${pos}${(board[pos[0]][pos[1]] as ColorPiece)[0].code}`);
  return `${occupied.length}:${pawns.join(' ')}`;
};

/** Moves of either player since the last kill or Pawn move: the boards of equal material end the history */
export const quietPlies = (history: History): number => {
  const current = material(recent(history));
  return history.filter((board) => material(board) === current).length - 1;
};

/** Pieces on the board, coded as Scala's Main renders them */
const boardKey = (board: Board): string =>
  board.map((row) => row.map((square) => (square ? square[0].code + square[1].code : '__')).join('')).join('/');

/** Position for repetition: pieces, castling rights and possible en passant kills of the player to move */
const positionKey = (color: Color) => (history: History): string => {
  const board = recent(history);
  const rights = [White, Black].flatMap((side) => castlings.map((castling) => canCastle(side, castling.rook)(history)));
  const passing = legalMoves(color)(history).filter((move) => board[move.from[0]][move.from[1]]?.[1] === Pawn
    && move.from[1] !== move.to[1] && isSquareVacant(board)(move.to));
  return [boardKey(board), rights.join(), passing.map((move) => String(move.from)).join()].join('#');
};

/** The position stands for the third time with the same player to move */
export const isThreefoldRepetition = (color: Color) => (history: History): boolean => {
  const board = boardKey(recent(history));
  const same = history.flatMap((past, index) =>
    ((history.length - 1 - index) % 2 === 0 && boardKey(past) === board ? [index] : []));
  if (same.length < 3) return false;
  const position = positionKey(color)(history);
  return same.filter((index) => positionKey(color)(history.slice(0, index + 1)) === position).length >= 3;
};

/** Outcome for the player who moves next (Scala looked only at the King's escapes; every legal reply counts) */
export const outcome = (color: Color) => (history: History): Outcome => {
  const board = recent(history);
  const checked = isKingInCheck(color)(board);
  if (legalMoves(color)(history).length === 0) return checked ? CheckMate : Stalemate;
  if (isInsufficientMaterial(board)) return InsufficientMaterial;
  if (quietPlies(history) >= 100) return FiftyMoves;
  if (isThreefoldRepetition(color)(history)) return Repetition;
  return checked ? Check : NextPlayer;
};

const finalOutcomes: readonly Outcome[] = [CheckMate, Stalemate, Repetition, FiftyMoves, InsufficientMaterial];

/** Check that the game cannot go on */
export const isGameOver = (result: Outcome): boolean => finalOutcomes.includes(result);

/** Main pieces in order as they appear on the chess board for player playing white */
export const pieces: readonly Piece[] = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook];

/** Empty chess board without any pieces */
export const emptyBoard: Board = range.map(() => range.map(() => null));

/** Place pieces of given color on the chess board */
export const initPieces = (color: Color) => (board: Board): Board =>
  board.map((row, rank) => row.map((square, file) => {
    if (rank === color.initialRanks[0]) return [color, pieces[file]] as const;
    if (rank === color.initialRanks[1]) return [color, Pawn] as const;
    return square;
  }));

/** Chess board with all pieces in initial positions */
export const newBoard: Board = initPieces(Black)(initPieces(White)(emptyBoard));

/**
 * State of the game of chess
 *
 * Stores most recent state of the game together with full undo history. Scala keeps three lists,
 * newest first; here they are arrays, oldest first. A game may start from any board and player.
 */
export class Game {
  private readonly start: Board;
  private readonly startTurn: Color;
  private readonly startOutcome: Outcome;
  private game: Board[] = [];
  private turns: Color[] = [];
  private outcomes: Outcome[] = [];

  constructor(board: Board = newBoard, turn: Color = White) {
    this.start = board;
    this.startTurn = turn;
    this.startOutcome = outcome(turn)([board]);
  }

  /** Plays a move of the player to move. Returns why the move is invalid, or null once it is played */
  play(fromRank: number, fromFile: number): (toRank: number, toFile: number, promotion?: Piece) => InvalidMove | null {
    return (toRank, toFile, promotion = Queen) => {
      if (isGameOver(this.lastOutcome)) return GameOver;
      const result = makeMove(fromRank, fromFile)(toRank, toFile, promotion)(this.turn)(this.history);
      if (isInvalid(result)) return result;
      this.turns.push(this.turn);
      this.game.push(result);
      this.outcomes.push(outcome(this.turn)(this.history));
      return null;
    };
  }

  undo(): void {
    this.game.pop();
    this.turns.pop();
    this.outcomes.pop();
  }

  get recent(): Board {
    return this.game.at(-1) ?? this.start;
  }

  get turn(): Color {
    const last = this.turns.at(-1);
    return last ? oppositeColor(last) : this.startTurn;
  }

  get previousTurn(): Color | null {
    return this.turns.at(-1) ?? null;
  }

  get lastOutcome(): Outcome {
    return this.outcomes.at(-1) ?? this.startOutcome;
  }

  /** Every board of the game, oldest first */
  get history(): History {
    return [this.start, ...this.game];
  }

  /** Number of moves played */
  get ply(): number {
    return this.game.length;
  }

  /** Legal moves of the player to move; none once the game is over */
  legalMoves(): Move[] {
    return isGameOver(this.lastOutcome) ? [] : legalMoves(this.turn)(this.history);
  }

  apply<T>(f: (board: Board) => T): T {
    return f(this.recent);
  }
}
