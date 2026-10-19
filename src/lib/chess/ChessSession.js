import { ChessBoard, PIECE, STARTING_FEN } from './ChessBoard.js';
import { SessionIdentity } from '../meet/SessionIdentity.js';
import { utf8ToBytes } from '../crum_bls/index.js';

export const ChessPhase = Object.freeze({
  Idle: 'Idle',
  AwaitingPeer: 'AwaitingPeer',
  Playing: 'Playing',
  AwaitingPromotion: 'AwaitingPromotion',
  Ended: 'Ended',
  Failed: 'Failed',
  Closed: 'Closed',
});

const MESSAGE = Object.freeze({
  Ready: 'ready',
  Move: 'move',
  Promotion: 'promotion',
  Resign: 'resign',
  Decline: 'decline',
});

function canonicalMove(move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function signPayload(identity, text) {
  return identity.sign(text);
}

/** Outcome of a finished game, computed identically by both peers. */
export class ChessResult {
  constructor(board, gameOver) {
    this.fen = board.toFEN();
    this.turn = board.turn;
    this.isCheckmate = gameOver && board.isCheckmate();
    this.isStalemate = gameOver && board.isStalemate();
    this.winner = this.isCheckmate
      ? (board.turn === PIECE.WHITE ? 'b' : 'w')
      : null;
    this.reason = this.isCheckmate ? 'checkmate' : this.isStalemate ? 'stalemate' : 'agreement';
  }
}

/**
 * Heads-up chess between two peers over an ordered, authenticated message pipe.
 * Both peers keep a full ChessBoard replica. Each move is signed and verified
 * against the prior-state hash before being applied, so cheating is detectable.
 */
export class ChessSession {
  constructor({ seat, identity, send, onChange = () => {}, log = () => {}, timer = globalThis }) {
    this.seat = seat;
    this.identity = identity;
    this.send = send;
    this.onChange = onChange;
    this.log = log;
    this.timer = timer;
    this.phase = ChessPhase.Idle;
    this.matchNo = 0;
    this.board = new ChessBoard();
    this.moves = [];
    this.lastResult = null;
    this.localReady = 0;
    this.remoteReady = 0;
    this.pendingPromotion = null;
    this.inbox = [];
    this.error = null;
  }

  currentTurnSeat() {
    return this.board.turn === PIECE.WHITE ? 0 : 1;
  }

  isMyTurn() {
    return this.phase === ChessPhase.Playing && this.currentTurnSeat() === this.seat;
  }

  connect() {
    this.requestMatch(this.matchNo + 1);
  }

  disconnect() {
    if (this.phase === ChessPhase.Closed) return;
    this.transition(ChessPhase.AwaitingPeer);
  }

  close() {
    this.transition(ChessPhase.Closed);
  }

  requestMatch(matchNo) {
    this.localReady = matchNo;
    this.send({ kind: MESSAGE.Ready, match: matchNo });
    this.reconcile();
    this.onChange();
  }

  reconcile() {
    if (this.remoteReady > this.localReady) this.requestMatch(this.remoteReady);
    else if (this.remoteReady === this.localReady && this.phase !== ChessPhase.Playing) this.startMatch(this.localReady);
  }

  startMatch(matchNo) {
    this.matchNo = matchNo;
    this.board = new ChessBoard();
    this.moves = [];
    this.lastResult = null;
    this.pendingPromotion = null;
    this.inbox = [];
    this.error = null;
    this.log(`Match ${matchNo} started`);
    this.transition(ChessPhase.Playing);
  }

  transition(phase) {
    this.phase = phase;
    this.onChange();
  }

  fail(reason) {
    this.error = reason;
    this.log(`Error: ${reason}`);
    this.transition(ChessPhase.Failed);
  }

  /** Submit a move for this seat. Validates the target is a legal destination. */
  submitMove(move) {
    if (this.phase !== ChessPhase.Playing) return false;
    if (!this.isMyTurn()) return false;
    const legal = this.board.legalMoves();
    const match = legal.find((m) => m.from === move.from && m.to === move.to);
    if (!match) return false;
    if (match.promotion) {
      const chosen = move.promotion ?? 'q';
      this.pendingPromotion = { from: move.from, to: move.to, promotion: chosen };
      this.log(`Choose promotion at ${move.to} (q/r/b/n)`);
      this.transition(ChessPhase.AwaitingPromotion);
      this.onChange();
      return true;
    }
    this.applyAndPublish({ from: move.from, to: move.to, promotion: undefined });
    return true;
  }

  submitPromotion(promotion) {
    if (this.phase !== ChessPhase.AwaitingPromotion || !this.pendingPromotion) return false;
    this.applyAndPublish({ ...this.pendingPromotion, promotion });
    this.pendingPromotion = null;
    return true;
  }

  submitResign() {
    if (this.phase !== ChessPhase.Playing) return false;
    this.send({ kind: MESSAGE.Resign, match: this.matchNo, by: this.seat });
    if (this.lastResult) return false;
    this.lastResult = { winner: 1 - this.seat, reason: 'resignation' };
    this.log('Resigned');
    this.transition(ChessPhase.Ended);
    return true;
  }

  applyAndPublish(move) {
    const beforeFEN = this.board.toFEN();
    try {
      this.board.applyMove(move);
    } catch (error) {
      this.fail(`Local move rejected: ${error.message}`);
      return;
    }
    const signature = signPayload(this.identity, `${beforeFEN}|${canonicalMove(move)}`);
    this.moves.push({ ...move, by: this.seat, at: beforeFEN, signature });
    this.log(`Me: ${canonicalMove(move)}`);
    this.send({ kind: MESSAGE.Move, match: this.matchNo, fen: beforeFEN, move, signature });
    this.afterMove();
  }

  afterMove() {
    if (this.board.isGameOver()) {
      this.lastResult = new ChessResult(this.board, true);
      this.log(`Game over: ${this.lastResult.reason}`);
      this.transition(ChessPhase.Ended);
      return;
    }
    if (this.lastResult && this.lastResult.reason === 'resignation') return;
    this.onChange();
  }

  receive(message) {
    if (this.phase === ChessPhase.Closed) return;
    if (message.kind === MESSAGE.Ready) {
      this.remoteReady = Math.max(this.remoteReady, Number(message.match) || 0);
      this.reconcile();
      this.onChange();
      return;
    }
    if (message.kind === MESSAGE.Resign) {
      if (Number(message.match) === this.matchNo) {
        this.lastResult = { winner: this.seat, reason: 'resignation' };
        this.transition(ChessPhase.Ended);
        this.onChange();
      }
      return;
    }
    if (message.kind === MESSAGE.Move) {
      this.applyRemote(message);
    }
  }

  applyRemote(message) {
    if (Number(message.match) !== this.matchNo) {
      this.inbox.push(message);
      return;
    }
    if (this.phase !== ChessPhase.Playing) {
      this.inbox.push(message);
      return;
    }
    if (this.board.toFEN() !== message.fen) {
      this.fail(`Peer state mismatch (local ${this.board.toFEN().slice(0, 40)}..., remote ${String(message.fen).slice(0, 40)}...)`);
      return;
    }
    try {
      this.board.applyMove(message.move);
    } catch (error) {
      this.fail(`Peer move rejected: ${error.message}`);
      return;
    }
    this.moves.push({ ...message.move, by: 1 - this.seat, at: message.fen, signature: message.signature });
    this.log(`Them: ${canonicalMove(message.move)}`);
    this.afterMove();
  }

  view() {
    return {
      phase: this.phase,
      matchNo: this.matchNo,
      seat: this.seat,
      turn: this.currentTurnSeat(),
      fen: this.board.toFEN(),
      snapshot: this.board.snapshot(),
      legalMoves: this.phase === ChessPhase.Playing ? this.board.legalMoves() : [],
      history: this.moves,
      lastResult: this.lastResult,
      pendingPromotion: this.pendingPromotion,
      isMyTurn: this.isMyTurn(),
      error: this.error,
    };
  }
}
