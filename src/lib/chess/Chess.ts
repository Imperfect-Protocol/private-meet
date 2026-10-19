/*
 * TypeScript port of scala-games/Chess/src/Chess.scala.
 * The MIT License (MIT) Copyright (c) 2023, Sonia Sadhbh Kolasinska
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { Chess as ChessRules, DEFAULT_POSITION, type Square as RulesSquare } from 'chess.js';

export type MoveVector = readonly [number, number];
export type Square = readonly [rank: number, file: number];
export const FixedRange = 'FixedRange';
export const VariableRange = 'VariableRange';
export type MoveRange = typeof FixedRange | typeof VariableRange;

export interface Piece {
  readonly code: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
  readonly moveRange: MoveRange;
  readonly validMoves: readonly MoveVector[];
}

function vectors(...values: MoveVector[]): readonly MoveVector[] {
  return Object.freeze(values.map((value) => Object.freeze(value)));
}

const diagonals = vectors([1, -1], [1, 1], [-1, -1], [-1, 1]);
const orthogonals = vectors([1, 0], [0, -1], [0, 1], [-1, 0]);
const directions = Object.freeze([...diagonals, ...orthogonals]);

export const King: Piece = Object.freeze({ code: 'K', moveRange: FixedRange, validMoves: directions });
export const Queen: Piece = Object.freeze({ code: 'Q', moveRange: VariableRange, validMoves: directions });
export const Rook: Piece = Object.freeze({ code: 'R', moveRange: VariableRange, validMoves: orthogonals });
export const Bishop: Piece = Object.freeze({ code: 'B', moveRange: VariableRange, validMoves: diagonals });
export const Knight: Piece = Object.freeze({
  code: 'N',
  moveRange: FixedRange,
  validMoves: vectors([2, -1], [2, 1], [-2, -1], [-2, 1], [1, -2], [1, 2], [-1, -2], [-1, 2]),
});
export const Pawn = Object.freeze({
  code: 'P' as const,
  moveRange: FixedRange,
  validMoves: vectors([1, 0]),
  validKillMoves: vectors([1, -1], [1, 1]),
});

export interface Color {
  readonly code: '1' | '2';
  readonly name: 'White' | 'Black';
  readonly initialRanks: readonly [pieces: number, pawns: number];
}
export const White: Color = Object.freeze({ code: '1', name: 'White', initialRanks: [7, 6] as const });
export const Black: Color = Object.freeze({ code: '2', name: 'Black', initialRanks: [0, 1] as const });

export const NextPlayer = 'NextPlayer';
export const Check = 'Check';
export const CheckMate = 'CheckMate';
export const Stalemate = 'Stalemate';
export const Draw = 'Draw';
export type Outcome = typeof NextPlayer | typeof Check | typeof CheckMate | typeof Stalemate | typeof Draw;

export const NoPlayerTurn = 'NoPlayerTurn';
export const NoPiece = 'NoPiece';
export const InvalidLocation = 'InvalidLocation';
export const AlreadyOccupied = 'AlreadyOccupied';
export const NoMove = 'NoMove';
export const NoPawnMove = 'NoPawnMove';
export const MoveBlocked = 'MoveBlocked';
export const NotImplemented = 'NotImplemented';
export const KingInCheck = 'KingInCheck';
export const GameOver = 'GameOver';
export type InvalidMove = typeof NoPlayerTurn | typeof NoPiece | typeof InvalidLocation
  | typeof AlreadyOccupied | typeof NoMove | typeof NoPawnMove | typeof MoveBlocked
  | typeof NotImplemented | typeof KingInCheck | typeof GameOver;

export type ColorPiece = readonly [color: Color, piece: Piece];
export type MaybeColorPiece = ColorPiece | null;
/** Scala layout: rank 0 is Black's back rank, rank 7 is White's. */
export type Board = readonly (readonly MaybeColorPiece[])[];
/** Scala's Left(board)/Right(error), expressed as a discriminated TypeScript result. */
export type MoveResult = { readonly ok: true; readonly board: Board }
  | { readonly ok: false; readonly error: InvalidMove };
export type Promotion = 'q' | 'r' | 'b' | 'n';
export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: Promotion;
}

export let debug_enabled = false;
export function setDebugEnabled(enabled: boolean): void { debug_enabled = enabled; }
export function debug_log(message: string): void {
  if (debug_enabled) console.debug(`DBG> ${message}`);
}

const sameColor = (a: Color, b: Color): boolean => a.code === b.code;
const sameVector = (a: MoveVector, b: MoveVector): boolean => a[0] === b[0] && a[1] === b[1];
const invalid = (error: InvalidMove): MoveResult => ({ ok: false, error });

/** Freeze snapshots so callers cannot mutate Game.recent or its undo history. */
function freezeBoard(board: Board): Board {
  return Object.freeze(board.map((row) => Object.freeze(row.map((square) => (
    square === null ? null : Object.freeze([square[0], square[1]] as const)
  )))));
}

export const moveVector = (fromRank: number, fromFile: number) =>
  (toRank: number, toFile: number) => (color: Color): MoveVector => (
    sameColor(color, Black) ? [toRank - fromRank, toFile - fromFile] : [fromRank - toRank, fromFile - toFile]
  );

export function normalizeVector(vector: MoveVector): MoveVector {
  return [Math.sign(vector[0]), Math.sign(vector[1])];
}
export function oppositeColor(color: Color): Color { return sameColor(color, White) ? Black : White; }

export function isValidSquare(position: Square): boolean;
export function isValidSquare(rank: number, file: number): boolean;
export function isValidSquare(rankOrPosition: number | Square, file?: number): boolean {
  const rank = typeof rankOrPosition === 'number' ? rankOrPosition : rankOrPosition[0];
  const column = typeof rankOrPosition === 'number' ? file : rankOrPosition[1];
  return Number.isInteger(rank) && rank >= 0 && rank < 8
    && column !== undefined && Number.isInteger(column) && column >= 0 && column < 8;
}

export const isSquareVacant = (board: Board) => (position: Square): boolean =>
  isValidSquare(position) && board[position[0]][position[1]] === null;

export const isOccupied = (rank: number, file: number) => (color: Color) => (board: Board): boolean => {
  if (!isValidSquare(rank, file)) return false;
  const occupant = board[rank][file];
  return occupant !== null && sameColor(occupant[0], color);
};

export const nextSquare = (rank: number, file: number) => (color: Color) => (vector: MoveVector): Square =>
  sameColor(color, Black) ? [rank + vector[0], file + vector[1]] : [rank - vector[0], file - vector[1]];

export const nextVector = (vector: MoveVector) => (increment: MoveVector): MoveVector =>
  [vector[0] + increment[0], vector[1] + increment[1]];

export const distanceVector = (fromRank: number, fromFile: number) =>
  (toRank: number, toFile: number): MoveVector => [toRank - fromRank, toFile - fromFile];

export const createPath = (fromRank: number, fromFile: number) =>
  (toRank: number, toFile: number): Square[] => {
    const distance = distanceVector(fromRank, fromFile)(toRank, toFile);
    if (distance[0] !== 0 && distance[1] !== 0 && Math.abs(distance[0]) !== Math.abs(distance[1])) return [];
    const direction = normalizeVector(distance);
    const steps = Math.max(Math.abs(distance[0]), Math.abs(distance[1]));
    return Array.from({ length: steps + 1 }, (_unused, step) =>
      [fromRank + step * direction[0], fromFile + step * direction[1]] as Square);
  };

export const isPathBlocked = (fromRank: number, fromFile: number) =>
  (toRank: number, toFile: number) => (board: Board): boolean =>
    createPath(fromRank, fromFile)(toRank, toFile).slice(1, -1).some((position) =>
      !isValidSquare(position) || !isSquareVacant(board)(position));

export const findPathBlocker = (fromRank: number, fromFile: number) => (color: Color) =>
  (vector: MoveVector) => (board: Board): readonly [ColorPiece, Square] | null => {
    for (let step = 1; step <= 7; step += 1) {
      const position = nextSquare(fromRank, fromFile)(color)([vector[0] * step, vector[1] * step]);
      if (!isValidSquare(position)) break;
      const occupant = board[position[0]][position[1]];
      if (occupant !== null) return [occupant, position];
    }
    return null;
  };

const threatsAt = (piece: Piece, rank: number, file: number, color: Color, board: Board,
  moves: readonly MoveVector[] = piece.validMoves): boolean => moves.some((vector) => {
    const square = nextSquare(rank, file)(color)(vector);
    if (!isValidSquare(square)) return false;
    const occupant = board[square[0]][square[1]];
    return occupant !== null && sameColor(occupant[0], oppositeColor(color)) && occupant[1].code === piece.code;
  });

export const isKnightCheckAt = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  threatsAt(Knight, rank, file, color, board);
export const isPawnCheckAt = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  threatsAt(Pawn, rank, file, color, board, Pawn.validKillMoves);
export const isVariableRangeCheckAt = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  Queen.validMoves.some((vector) => {
    const blocker = findPathBlocker(rank, file)(color)(vector)(board);
    return blocker !== null && sameColor(blocker[0][0], oppositeColor(color))
      && blocker[0][1].moveRange === VariableRange
      && blocker[0][1].validMoves.some((move) => sameVector(move, vector));
  });

export const isCheckAt = (rank: number, file: number) => (color: Color) => (board: Board): boolean =>
  isKnightCheckAt(rank, file)(color)(board) || isPawnCheckAt(rank, file)(color)(board)
  || isVariableRangeCheckAt(rank, file)(color)(board) || threatsAt(King, rank, file, color, board);

export const kingSquare = (color: Color) => (board: Board): Square | null => {
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = board[rank][file];
      if (square !== null && sameColor(square[0], color) && square[1].code === King.code) return [rank, file];
    }
  }
  return null;
};

export const inCheck = (color: Color) => (board: Board): boolean => {
  const king = kingSquare(color)(board);
  return king === null || isCheckAt(king[0], king[1])(color)(board);
};

export const movePieceValid = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): Board => freezeBoard(board.map((row, rank) =>
    row.map((square, file) => {
      if (rank === fromRank && file === fromFile) return null;
      if (rank === toRank && file === toFile) return [color, piece] as ColorPiece;
      return square;
    })));

export const movePawn = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color) => (board: Board): MoveResult => {
    const vector = moveVector(fromRank, fromFile)(toRank, toFile)(color);
    const occupied = board[toRank][toFile] !== null;
    if (vector[0] === 1 && vector[1] === 0) {
      if (occupied) return invalid(MoveBlocked);
    } else if (vector[0] === 2 && vector[1] === 0) {
      if (fromRank !== color.initialRanks[1]) return invalid(NoPawnMove);
      if (occupied || isPathBlocked(fromRank, fromFile)(toRank, toFile)(board)) return invalid(MoveBlocked);
    } else if (vector[0] === 1 && Math.abs(vector[1]) === 1) {
      if (!isOccupied(toRank, toFile)(oppositeColor(color))(board)) return invalid(NoPawnMove);
    } else {
      return invalid(NoMove);
    }
    const promoted = toRank === 0 || toRank === 7 ? Queen : Pawn;
    return { ok: true, board: movePieceValid(fromRank, fromFile)(toRank, toFile)(color, promoted)(board) };
  };

export const movePieceFixed = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): MoveResult => {
    const vector = moveVector(fromRank, fromFile)(toRank, toFile)(color);
    if (!piece.validMoves.some((move) => sameVector(move, vector))) return invalid(NoMove);
    return { ok: true, board: movePieceValid(fromRank, fromFile)(toRank, toFile)(color, piece)(board) };
  };

export const movePieceVariable = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): MoveResult => {
    const vector = moveVector(fromRank, fromFile)(toRank, toFile)(color);
    const straight = vector[0] === 0 || vector[1] === 0 || Math.abs(vector[0]) === Math.abs(vector[1]);
    if (!straight || !piece.validMoves.some((move) => sameVector(move, normalizeVector(vector)))) return invalid(NoMove);
    if (isPathBlocked(fromRank, fromFile)(toRank, toFile)(board)) return invalid(MoveBlocked);
    return { ok: true, board: movePieceValid(fromRank, fromFile)(toRank, toFile)(color, piece)(board) };
  };

export const movePiece = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color, piece: Piece) => (board: Board): MoveResult => {
    if (!isValidSquare(fromRank, fromFile) || !isValidSquare(toRank, toFile)) return invalid(InvalidLocation);
    if (fromRank === toRank && fromFile === toFile) return invalid(NoMove);
    if (isOccupied(toRank, toFile)(color)(board)) return invalid(AlreadyOccupied);
    if (board[toRank][toFile]?.[1].code === King.code) return invalid(NoMove);
    if (piece.code === Pawn.code) return movePawn(fromRank, fromFile)(toRank, toFile)(color)(board);
    return piece.moveRange === FixedRange
      ? movePieceFixed(fromRank, fromFile)(toRank, toFile)(color, piece)(board)
      : movePieceVariable(fromRank, fromFile)(toRank, toFile)(color, piece)(board);
  };

export const makeMove = (fromRank: number, fromFile: number) => (toRank: number, toFile: number) =>
  (color: Color) => (board: Board): MoveResult => {
    if (!isValidSquare(fromRank, fromFile) || !isValidSquare(toRank, toFile)) return invalid(InvalidLocation);
    const square = board[fromRank][fromFile];
    if (square === null) return invalid(NoPiece);
    if (!sameColor(square[0], color)) return invalid(NoPlayerTurn);
    const result = movePiece(fromRank, fromFile)(toRank, toFile)(color, square[1])(board);
    if (result.ok && inCheck(color)(result.board)) return invalid(KingInCheck);
    return result;
  };

/** All legal responses are considered, including interposition and capture of the checking piece. */
export const legalMoves = (color: Color) => (board: Board): Move[] => {
  const moves: Move[] = [];
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      if (!isOccupied(rank, file)(color)(board)) continue;
      for (let toRank = 0; toRank < 8; toRank += 1) {
        for (let toFile = 0; toFile < 8; toFile += 1) {
          if (makeMove(rank, file)(toRank, toFile)(color)(board).ok) {
            moves.push({ from: [rank, file], to: [toRank, toFile] });
          }
        }
      }
    }
  }
  return moves;
};

export const outcome = (color: Color) => (board: Board): Outcome => {
  const checked = inCheck(color)(board);
  const canMove = legalMoves(color)(board).length > 0;
  return checked ? (canMove ? Check : CheckMate) : (canMove ? NextPlayer : Stalemate);
};

export const pieces: readonly Piece[] = Object.freeze([Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook]);
export const emptyBoard: Board = freezeBoard(Array.from({ length: 8 }, () => Array<MaybeColorPiece>(8).fill(null)));
export const initPieces = (color: Color) => (board: Board): Board => freezeBoard(board.map((row, rank) =>
  row.map((square, file) => {
    if (rank === color.initialRanks[0]) return [color, pieces[file]] as ColorPiece;
    if (rank === color.initialRanks[1]) return [color, Pawn] as ColorPiece;
    return square;
  })));
export const newBoard: Board = initPieces(Black)(initPieces(White)(emptyBoard));

interface GameState {
  readonly board: Board;
  readonly turn: Color;
  readonly previousTurn: Color | null;
  readonly outcome: Outcome;
}

const pieceByCode: Record<string, Piece> = { k: King, q: Queen, r: Rook, b: Bishop, n: Knight, p: Pawn };
const algebraic = (rank: number, file: number): RulesSquare => `${'abcdefgh'[file]}${8 - rank}` as RulesSquare;
const coordinates = (square: string): Square => [8 - Number(square[1]), square.charCodeAt(0) - 97];

function boardFen(board: Board, turn: Color): string {
  const rows = board.map((row) => {
    let empty = 0;
    let text = '';
    for (const square of row) {
      if (square === null) { empty += 1; continue; }
      if (empty) { text += empty; empty = 0; }
      text += square[0].code === White.code ? square[1].code : square[1].code.toLowerCase();
    }
    return text + (empty || '');
  });
  return `${rows.join('/')} ${turn.code === White.code ? 'w' : 'b'} - - 0 1`;
}

/**
 * Scala-compatible game object with standard rules supplied by chess.js.
 * Custom Board positions have no castling/en-passant rights; use fromFEN for those.
 * play returns null on success or an InvalidMove value without changing state.
 */
export class Game {
  private readonly rules: ChessRules;
  private readonly initial: GameState;
  private readonly history: GameState[] = [];

  constructor(board: Board | string = newBoard, turn: Color = White) {
    const fen = typeof board === 'string' ? board
      : board === newBoard && turn.code === White.code ? DEFAULT_POSITION : boardFen(board, turn);
    this.rules = new ChessRules(fen);
    this.initial = this.readState(null);
  }

  static fromFEN(fen: string): Game { return new Game(fen); }

  play(fromRank: number, fromFile: number): (toRank: number, toFile: number, promotion?: Promotion) => InvalidMove | null {
    return (toRank, toFile, promotion = 'q') => {
      if (!isValidSquare(fromRank, fromFile) || !isValidSquare(toRank, toFile)) return InvalidLocation;
      if (this.rules.isGameOver()) return GameOver;
      const source = this.recent[fromRank][fromFile];
      if (source === null) return NoPiece;
      if (source[0].code !== this.turn.code) return NoPlayerTurn;
      if (fromRank === toRank && fromFile === toFile) return NoMove;
      if (isOccupied(toRank, toFile)(this.turn)(this.recent)) return AlreadyOccupied;
      if (!['q', 'r', 'b', 'n'].includes(promotion)) return NoMove;
      const movingColor = this.turn;
      try {
        this.rules.move({ from: algebraic(fromRank, fromFile), to: algebraic(toRank, toFile), promotion });
      } catch {
        const diagnostic = makeMove(fromRank, fromFile)(toRank, toFile)(this.turn)(this.recent);
        return diagnostic.ok ? NoMove : diagnostic.error;
      }
      this.history.push(this.readState(movingColor));
      return null;
    };
  }

  legalMoves(): Move[] {
    if (this.rules.isGameOver()) return [];
    return this.rules.moves({ verbose: true }).map((move) => ({
      from: coordinates(move.from), to: coordinates(move.to),
      ...(move.promotion ? { promotion: move.promotion as Promotion } : {}),
    }));
  }

  undo(): void {
    if (this.history.length && this.rules.undo()) this.history.pop();
  }
  get recent(): Board { return this.state.board; }
  get turn(): Color { return this.state.turn; }
  get previousTurn(): Color | null { return this.state.previousTurn; }
  get lastOutcome(): Outcome { return this.state.outcome; }
  get ply(): number { return this.history.length; }
  get fen(): string { return this.rules.fen(); }
  get drawReason(): 'repetition' | 'fifty-move' | 'insufficient-material' | null {
    if (this.rules.isThreefoldRepetition()) return 'repetition';
    if (this.rules.isDrawByFiftyMoves()) return 'fifty-move';
    if (this.rules.isInsufficientMaterial()) return 'insufficient-material';
    return null;
  }
  apply<T>(fn: (board: Board) => T): T { return fn(this.recent); }
  private get state(): GameState { return this.history.at(-1) ?? this.initial; }

  private readState(previousTurn: Color | null): GameState {
    const board = this.rules.board().map((row) => row.map((square): MaybeColorPiece =>
      square === null ? null : [square.color === 'w' ? White : Black, pieceByCode[square.type]]));
    const result = this.rules.isCheckmate() ? CheckMate
      : this.rules.isStalemate() ? Stalemate
      : this.rules.isDraw() ? Draw : this.rules.isCheck() ? Check : NextPlayer;
    return { board: freezeBoard(board), turn: this.rules.turn() === 'w' ? White : Black, previousTurn, outcome: result };
  }
}
