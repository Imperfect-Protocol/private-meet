/**
 * Lightweight heads-up chess engine. Pure data, no UI, no network.
 *
 * 8x8 board, 0x88-like address scheme, algebraic notation, standard chess rules
 * minus threefold repetition, fifty-move rule, and underpromotion (v1.1).
 *
 * Coordinate format: squares are "a1"–"h8". Files a–h are columns 0–7,
 * ranks 1–8 are rows 0–7 (rank 1 is the white back rank, rank 8 is the black back rank).
 *
 * Move format: {
 *   from: 'e2',
 *   to: 'e4',
 *   promotion?: 'q' | 'r' | 'b' | 'n',  // omitted except for a pawn reaching the last rank
 * }
 */

export const PIECE = Object.freeze({
  PAWN: 'p', KNIGHT: 'n', BISHOP: 'b', ROOK: 'r', QUEEN: 'q', KING: 'k',
  WHITE: 'w', BLACK: 'b',
});

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function squareIndex(square) {
  if (typeof square !== 'string' || square.length !== 2) return -1;
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  if (file < 0 || rank < 1 || rank > 8) return -1;
  // The board is stored with FEN rank 8 at the top (idx 0-7) and rank 1 at the bottom (idx 56-63).
  return (8 - rank) * 8 + file;
}

function indexToSquare(index) {
  return `${FILES[index % 8]}${Math.floor(index / 8) + 1}`;
}

function colorOf(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? PIECE.WHITE : PIECE.BLACK;
}

function pieceType(piece) {
  return piece ? piece.toLowerCase() : piece;
}

function copyBoard(board) {
  return board.slice();
}

function applyMove(board, move, { castling, enPassant } = {}) {
  const fromIdx = squareIndex(move.from);
  const toIdx = squareIndex(move.to);
  if (fromIdx < 0 || toIdx < 0) throw new Error(`invalid move: ${move.from}->${move.to}`);
  const piece = board[fromIdx];
  if (!piece) throw new Error(`no piece on ${move.from}`);
  const target = board[toIdx];
  const movingType = pieceType(piece);
  const next = copyBoard(board);
  next[fromIdx] = null;
  next[toIdx] = piece;

  // Castling: rook jumps the king.
  if (castling) {
    if (movingType === 'k' && Math.abs(toIdx - fromIdx) === 2) {
      const isKingside = toIdx > fromIdx;
      const rank = Math.floor(fromIdx / 8);
      const rookFrom = isKingside ? rank * 8 + 7 : rank * 8 + 0;
      const rookTo = isKingside ? rank * 8 + 5 : rank * 8 + 3;
      next[rookFrom] = null;
      next[rookTo] = piece === 'K' ? 'R' : 'r';
    }
  }

  // En passant: capture the pawn that sits behind the destination.
  if (enPassant && movingType === 'p' && toIdx === enPassant.target) {
    next[enPassant.captured] = null;
  }

  // Pawn promotion.
  if (movingType === 'p' && move.promotion) {
    next[toIdx] = (colorOf(piece) === PIECE.WHITE ? move.promotion.toUpperCase() : move.promotion);
  }

  return next;
}

const KNIGHT_OFFSETS = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
const KING_OFFSETS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function inBounds(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function pseudoLegalMoves(board, turn, enPassantTarget) {
  const moves = [];
  for (let idx = 0; idx < 64; idx += 1) {
    const piece = board[idx];
    if (!piece || colorOf(piece) !== turn) continue;
    const fromFile = idx % 8;
    const fromRank = Math.floor(idx / 8);
    const type = pieceType(piece);

    if (type === 'p') {
      // Pieces are stored with FEN rank 8 at the top (idx 0-7) and rank 1 at the bottom (idx 56-63).
      // White pawns (at FEN rank 2) move toward FEN rank 8, i.e. toward row 0.
      const dir = turn === PIECE.WHITE ? -1 : 1;
      const startRank = turn === PIECE.WHITE ? 6 : 1;
      const promoteRank = turn === PIECE.WHITE ? 0 : 7;
      const forward = (fromRank + dir) * 8 + fromFile;
      if (inBounds(fromFile, fromRank + dir) && !board[forward]) {
        if (fromRank + dir === promoteRank) {
          for (const promotion of ['q', 'r', 'b', 'n']) moves.push({ from: indexToSquare(idx), to: indexToSquare(forward), promotion });
        } else {
          moves.push({ from: indexToSquare(idx), to: indexToSquare(forward) });
          if (fromRank === startRank) {
            const double = (fromRank + 2 * dir) * 8 + fromFile;
            if (!board[double]) moves.push({ from: indexToSquare(idx), to: indexToSquare(double) });
          }
        }
      }
      for (const dFile of [-1, 1]) {
        const target = (fromRank + dir) * 8 + fromFile + dFile;
        if (!inBounds(fromFile + dFile, fromRank + dir)) continue;
        const targetPiece = board[target];
        if (targetPiece && colorOf(targetPiece) !== turn) {
          if (fromRank + dir === promoteRank) {
            for (const promotion of ['q', 'r', 'b', 'n']) moves.push({ from: indexToSquare(idx), to: indexToSquare(target), promotion });
          } else {
            moves.push({ from: indexToSquare(idx), to: indexToSquare(target) });
          }
        } else if (enPassantTarget != null && target === enPassantTarget) {
          const capturedIdx = fromRank * 8 + fromFile + dFile;
          moves.push({ from: indexToSquare(idx), to: indexToSquare(target), enPassant: true });
        }
      }
      continue;
    }

    const slide = (dirs) => {
      for (const [df, dr] of dirs) {
        let file = fromFile;
        let rank = fromRank;
        for (;;) {
          file += df;
          rank += dr;
          if (!inBounds(file, rank)) break;
          const toIdx = rank * 8 + file;
          const occupant = board[toIdx];
          if (!occupant) {
            moves.push({ from: indexToSquare(idx), to: indexToSquare(toIdx) });
            continue;
          }
          if (colorOf(occupant) !== turn) moves.push({ from: indexToSquare(idx), to: indexToSquare(toIdx) });
          break;
        }
      }
    };
    if (type === 'n') {
      for (const [df, dr] of KNIGHT_OFFSETS) {
        const file = fromFile + df;
        const rank = fromRank + dr;
        if (!inBounds(file, rank)) continue;
        const toIdx = rank * 8 + file;
        const occupant = board[toIdx];
        if (!occupant || colorOf(occupant) !== turn) moves.push({ from: indexToSquare(idx), to: indexToSquare(toIdx) });
      }
    }
    if (type === 'b') slide(BISHOP_DIRS);
    if (type === 'r') slide(ROOK_DIRS);
    if (type === 'q') {
      slide(BISHOP_DIRS);
      slide(ROOK_DIRS);
    }
    if (type === 'k') {
      for (const [df, dr] of KING_OFFSETS) {
        const file = fromFile + df;
        const rank = fromRank + dr;
        if (!inBounds(file, rank)) continue;
        const toIdx = rank * 8 + file;
        const occupant = board[toIdx];
        if (!occupant || colorOf(occupant) !== turn) moves.push({ from: indexToSquare(idx), to: indexToSquare(toIdx) });
      }
    }
  }
  return moves;
}

function findKing(board, color) {
  for (let idx = 0; idx < 64; idx += 1) {
    const piece = board[idx];
    if (piece && pieceType(piece) === 'k' && colorOf(piece) === color) return idx;
  }
  return -1;
}

function isSquareAttacked(board, squareIdx, byColor) {
  if (squareIdx < 0) return false;
  const file = squareIdx % 8;
  const rank = Math.floor(squareIdx / 8);

  // Pawns.
  const pawnDir = byColor === PIECE.WHITE ? -1 : 1;
  for (const df of [-1, 1]) {
    const f = file + df;
    const r = rank + pawnDir;
    if (inBounds(f, r)) {
      const piece = board[r * 8 + f];
      if (piece && pieceType(piece) === 'p' && colorOf(piece) === byColor) return true;
    }
  }

  // Knights.
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (inBounds(f, r)) {
      const piece = board[r * 8 + f];
      if (piece && pieceType(piece) === 'n' && colorOf(piece) === byColor) return true;
    }
  }

  // Sliding: bishops/queens on diagonals, rooks/queens on orthogonals.
  const slide = (dirs, allowed) => {
    for (const [df, dr] of dirs) {
      let f = file;
      let r = rank;
      for (;;) {
        f += df;
        r += dr;
        if (!inBounds(f, r)) break;
        const piece = board[r * 8 + f];
        if (!piece) continue;
        if (colorOf(piece) === byColor && allowed.includes(pieceType(piece))) return true;
        break;
      }
    }
    return false;
  };
  if (slide(BISHOP_DIRS, ['b', 'q'])) return true;
  if (slide(ROOK_DIRS, ['r', 'q'])) return true;

  // King.
  for (const [df, dr] of KING_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (inBounds(f, r)) {
      const piece = board[r * 8 + f];
      if (piece && pieceType(piece) === 'k' && colorOf(piece) === byColor) return true;
    }
  }
  return false;
}

function inCheck(board, color) {
  const kingIdx = findKing(board, color);
  if (kingIdx < 0) return false;
  return isSquareAttacked(board, kingIdx, color === PIECE.WHITE ? PIECE.BLACK : PIECE.WHITE);
}

function pseudoLegalWithCastling(board, turn, state) {
  const moves = pseudoLegalMoves(board, turn, state.enPassantTarget);
  const turnIsWhite = turn === PIECE.WHITE;
  // White king starts at FEN rank 1 (row 7 in our layout); black king at FEN rank 8 (row 0).
  const fromRank = turnIsWhite ? 7 : 0;
  const kingStart = fromRank * 8 + 4;
  const kingPiece = board[kingStart];
  if (!kingPiece || pieceType(kingPiece) !== 'k' || colorOf(kingPiece) !== turn) return moves;
  if (inCheck(board, turn)) return moves;

  const canKingside = turnIsWhite ? state.castling[0] : state.castling[2];
  const canQueenside = turnIsWhite ? state.castling[1] : state.castling[3];
  if (canKingside) {
    const passThroughSquares = turnIsWhite ? [5, 6] : [61, 62];
    if (passThroughSquares.every((idx) => !board[idx]) && passThroughSquares.every((idx) => !isSquareAttacked(board, idx, turn === PIECE.WHITE ? PIECE.BLACK : PIECE.WHITE))) {
      moves.push({ from: 'e' + (turnIsWhite ? 1 : 8), to: 'g' + (turnIsWhite ? 1 : 8) });
    }
  }
  if (canQueenside) {
    const passThroughSquares = turnIsWhite ? [1, 2, 3] : [57, 58, 59];
    if (passThroughSquares.every((idx) => !board[idx]) && passThroughSquares.every((idx) => !isSquareAttacked(board, idx, turn === PIECE.WHITE ? PIECE.BLACK : PIECE.WHITE))) {
      moves.push({ from: 'e' + (turnIsWhite ? 1 : 8), to: 'c' + (turnIsWhite ? 1 : 8) });
    }
  }
  return moves;
}

function legalMoves(board, turn, state) {
  const candidates = pseudoLegalWithCastling(board, turn, state);
  const enemy = turn === PIECE.WHITE ? PIECE.BLACK : PIECE.WHITE;
  return candidates.filter((move) => {
    let nextEnPassant = null;
    let castling = null;
    let enPassant = null;
    const fromIdx = squareIndex(move.from);
    const piece = board[fromIdx];
    const movingType = pieceType(piece);
    if (movingType === 'p') {
      const dir = turn === PIECE.WHITE ? 1 : -1;
      const fromRank = Math.floor(fromIdx / 8);
      const toRank = fromRank + dir;
      if (Math.abs(squareIndex(move.to) - fromIdx) === 16) {
        nextEnPassant = { square: ((fromRank + toRank) / 2) * 8 + (fromIdx % 8), color: enemy };
      }
      if (move.to === indexToSquare(state.enPassantTarget)) {
        const capturedIdx = fromRank * 8 + (squareIndex(move.to) % 8);
        enPassant = { target: squareIndex(move.to), captured: capturedIdx };
      }
    }
    if (movingType === 'k' && Math.abs(squareIndex(move.to) - fromIdx) === 2) {
      castling = true;
    }
    const nextBoard = applyMove(board, move, { castling, enPassant });
    if (inCheck(nextBoard, turn)) return false;
    return true;
  });
}

function updateCastlingRights(state, move, piece) {
  const castling = [...state.castling];
  if (piece && pieceType(piece) === 'k') {
    if (colorOf(piece) === PIECE.WHITE) { castling[0] = false; castling[1] = false; }
    else { castling[2] = false; castling[3] = false; }
  }
  if (move.from === 'a1' || move.to === 'a1') castling[1] = false;
  if (move.from === 'h1' || move.to === 'h1') castling[0] = false;
  if (move.from === 'a8' || move.to === 'a8') castling[3] = false;
  if (move.from === 'h8' || move.to === 'h8') castling[2] = false;
  return castling;
}

function halfmoveClock(board, move, piece) {
  if (pieceType(piece) === 'p' || board[squareIndex(move.to)]) return 0;
  return null;
}

export class ChessBoard {
  constructor() {
    this.reset();
  }

  static fromFEN(fen) {
    const board = new ChessBoard();
    board.loadFEN(fen);
    return board;
  }

  reset() {
    this.board = new Array(64).fill(null);
    this.turn = PIECE.WHITE;
    this.castling = [true, true, true, true];
    this.enPassantTarget = null;
    this.halfmove = 0;
    this.fullmove = 1;
    this.history = [];
    this.loadFEN(STARTING_FEN);
  }

  loadFEN(fen) {
    const [placement, turn, castling, enPassant, halfmove, fullmove] = fen.split(' ');
    this.board = new Array(64).fill(null);
    let idx = 0;
    for (const ch of placement) {
      if (ch === '/') continue;
      if (/\d/.test(ch)) idx += Number(ch);
      else { this.board[idx] = ch; idx += 1; }
    }
    this.turn = turn === 'b' ? PIECE.BLACK : PIECE.WHITE;
    this.castling = [
      castling.includes('K'),
      castling.includes('Q'),
      castling.includes('k'),
      castling.includes('q'),
    ];
    this.enPassantTarget = enPassant === '-' ? null : squareIndex(enPassant);
    this.halfmove = Number(halfmove ?? 0);
    this.fullmove = Number(fullmove ?? 1);
    this.history = [];
  }

  toFEN() {
    let placement = '';
    for (let rank = 7; rank >= 0; rank -= 1) {
      let empty = 0;
      for (let file = 0; file < 8; file += 1) {
        const piece = this.board[rank * 8 + file];
        if (piece) { if (empty > 0) { placement += empty; empty = 0; } placement += piece; }
        else empty += 1;
      }
      if (empty > 0) placement += empty;
      if (rank > 0) placement += '/';
    }
    const castling = `${this.castling[0] ? 'K' : ''}${this.castling[1] ? 'Q' : ''}${this.castling[2] ? 'k' : ''}${this.castling[3] ? 'q' : ''}` || '-';
    const enPassant = this.enPassantTarget == null ? '-' : indexToSquare(this.enPassantTarget);
    return `${placement} ${this.turn} ${castling} ${enPassant} ${this.halfmove} ${this.fullmove}`;
  }

  pieceAt(square) {
    return this.board[squareIndex(square)] ?? null;
  }

  inCheck(color = this.turn) {
    return inCheck(this.board, color);
  }

  legalMoves() {
    return legalMoves(this.board, this.turn, { castling: this.castling, enPassantTarget: this.enPassantTarget });
  }

  /** Apply a legal move. Throws on illegal. Returns the previous state for undo. */
  applyMove(move) {
    const fromIdx = squareIndex(move.from);
    const piece = this.board[fromIdx];
    if (!piece) throw new Error(`no piece on ${move.from}`);
    if (colorOf(piece) !== this.turn) throw new Error(`not your turn: ${move.to}`);
    const legal = this.legalMoves().some((m) => m.from === move.from && m.to === move.to && (m.promotion ?? null) === (move.promotion ?? null));
    if (!legal) throw new Error(`illegal move ${move.from}->${move.to}${move.promotion ? '=' + move.promotion : ''}`);

    let enPassant = null;
    if (pieceType(piece) === 'p' && move.to === indexToSquare(this.enPassantTarget)) {
      const toFile = squareIndex(move.to) % 8;
      const fromRank = Math.floor(fromIdx / 8);
      enPassant = { target: squareIndex(move.to), captured: fromRank * 8 + toFile };
    }
    const castling = pieceType(piece) === 'k' && Math.abs(squareIndex(move.to) - fromIdx) === 2;

    const before = { board: this.board.slice(), turn: this.turn, castling: [...this.castling], enPassantTarget: this.enPassantTarget, halfmove: this.halfmove, fullmove: this.fullmove };
    this.board = applyMove(this.board, move, { castling, enPassant });
    this.castling = updateCastlingRights({ castling: this.castling }, move, piece);
    const newEnPassant = pieceType(piece) === 'p' && Math.abs(squareIndex(move.to) - fromIdx) === 16
      ? (Math.floor(fromIdx / 8) + Math.floor(squareIndex(move.to) / 8)) / 2 * 8 + (fromIdx % 8)
      : null;
    this.enPassantTarget = newEnPassant;
    this.halfmove = halfmoveClock(this.board, move, piece) ?? (this.halfmove + 1);
    this.fullmove += this.turn === PIECE.BLACK ? 1 : 0;
    this.turn = this.turn === PIECE.WHITE ? PIECE.BLACK : PIECE.WHITE;
    this.history.push(before);
    return before;
  }

  isCheckmate() {
    if (!this.inCheck()) return false;
    return this.legalMoves().length === 0;
  }

  isStalemate() {
    if (this.inCheck()) return false;
    return this.legalMoves().length === 0;
  }

  isGameOver() {
    return this.legalMoves().length === 0;
  }

  /** Render the board as a 2-D array of piece characters indexed [rank 0..7][file 0..7]. */
  snapshot() {
    const ranks = [];
    for (let rank = 7; rank >= 0; rank -= 1) {
      const row = [];
      for (let file = 0; file < 8; file += 1) row.push(this.board[rank * 8 + file]);
      ranks.push(row);
    }
    return ranks;
  }

  /** Squares currently offering a legal move to the piece on `from`. */
  legalTargetsFrom(from) {
    return this.legalMoves().filter((move) => move.from === from).map((move) => move.to);
  }
}
