import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import {
  Game, White, Check, CheckMate, Stalemate, Draw, type Move, type Promotion,
} from './Chess';
import { boardCharacters, isSquare, squareCoordinates, squareName } from './ChessPosition';

export const ChessPhase = Object.freeze({
  Idle: 'Idle', AwaitingPeer: 'AwaitingPeer', Playing: 'Playing',
  Ended: 'Ended', Failed: 'Failed', Closed: 'Closed',
} as const);
export type ChessPhase = typeof ChessPhase[keyof typeof ChessPhase];
type Seat = 0 | 1;
interface Identity { sign(text: string): string }
interface Verifier { verifies(text: string, signature: string): boolean }
type Action = { type: 'move'; move: Move } | { type: 'resign' };
interface Ready {
  kind: 'chess-ready'; version: 1; match: number; by: Seat;
}
interface Step {
  kind: 'chess-step'; version: 1; match: number; by: Seat;
  sequence: number; previous: string; position: string; action: Action;
}
interface Packet { body: string; signature: string }
export interface ChessMessage { kind: 'chess'; packet: Packet }
interface Options {
  seat: Seat;
  identity: Identity;
  send(message: ChessMessage): boolean | void;
  peerKey?: Verifier;
  onChange?: () => void;
  log?: (line: string) => void;
}
interface Result { winner: Seat | null; reason: 'checkmate' | 'stalemate' | 'resignation' | 'draw' }
interface HistoryEntry {
  from: string; to: string; by: Seat; signature: string; sequence: number;
  digest: string; verified: true;
}
const digest = (body: string): string => bytesToHex(sha256(new TextEncoder().encode(body)));
const validMatch = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;

/**
 * Two replicas of the Scala-style Game connected by signed, hash-linked actions.
 * Initial: Idle; final: Closed; protocol/signature failures: Failed.
 * Host is White, guest is Black. Media and transport remain outside the game.
 */
export class ChessSession {
  readonly seat: Seat;
  readonly identity: Identity;
  game = new Game();
  phase: ChessPhase = ChessPhase.Idle;
  matchNo = 0;
  moves: HistoryEntry[] = [];
  lastResult: Result | null = null;
  error: string | null = null;
  private readonly send: Options['send'];
  private readonly onChange: () => void;
  private readonly log: (line: string) => void;
  private peerKey?: Verifier;
  private connected = false;
  private localReady = 0;
  private remoteReady = 0;
  private sequence = 0;
  private tip = '';
  private readonly seen = new Set<string>();

  constructor(options: Options) {
    this.seat = options.seat;
    this.identity = options.identity;
    this.send = options.send;
    this.onChange = options.onChange ?? (() => {});
    this.log = options.log ?? (() => {});
    this.peerKey = options.peerKey;
  }

  setPeerKey(key: Verifier): void { this.peerKey = key; }
  currentTurnSeat(): Seat { return this.game.turn.code === White.code ? 0 : 1; }
  isMyTurn(): boolean { return this.connected && this.phase === ChessPhase.Playing && this.currentTurnSeat() === this.seat; }

  connect(): void {
    if (this.phase === ChessPhase.Closed || (this.connected && this.phase !== ChessPhase.AwaitingPeer)) return;
    this.connected = true;
    this.requestMatch(Math.max(this.matchNo + 1, this.remoteReady));
  }

  disconnect(): void {
    if (this.phase === ChessPhase.Closed) return;
    this.connected = false;
    this.transition(ChessPhase.AwaitingPeer);
  }

  close(): void {
    this.connected = false;
    this.transition(ChessPhase.Closed);
  }

  /** Both participants must request the rematch; it never reloads or interrupts the call. */
  requestRematch(): void {
    if (this.connected && this.phase === ChessPhase.Ended) this.requestMatch(this.matchNo + 1);
  }

  private requestMatch(match: number): void {
    if (this.phase !== ChessPhase.Ended) this.transition(ChessPhase.AwaitingPeer);
    if (!this.publish({ kind: 'chess-ready', version: 1, match, by: this.seat })) return;
    this.localReady = match;
    this.reconcile();
    this.onChange();
  }

  private reconcile(): void {
    if (!this.connected || this.localReady <= this.matchNo) return;
    if (this.remoteReady > this.localReady && this.phase === ChessPhase.AwaitingPeer) {
      this.requestMatch(this.remoteReady);
    } else if (this.remoteReady === this.localReady) {
      this.matchNo = this.localReady;
      this.game = new Game();
      this.moves = [];
      this.lastResult = null;
      this.error = null;
      this.sequence = 0;
      this.tip = digest(`private-meet:scala-chess:1:${this.matchNo}`);
      this.seen.clear();
      this.log(`Chess game ${this.matchNo} started`);
      this.transition(ChessPhase.Playing);
    }
  }

  submitMove(move: { from: string; to: string; promotion?: Promotion }): boolean {
    if (!this.isMyTurn()) return false;
    const from = squareCoordinates(move.from);
    const to = squareCoordinates(move.to);
    if (!from || !to) return false;
    return this.submit({ type: 'move', move: { from, to, ...(move.promotion ? { promotion: move.promotion } : {}) } });
  }

  submitResign(): boolean {
    if (!this.connected || this.phase !== ChessPhase.Playing) return false;
    return this.submit({ type: 'resign' });
  }

  private submit(action: Action): boolean {
    const step: Step = {
      kind: 'chess-step', version: 1, match: this.matchNo, by: this.seat,
      sequence: this.sequence + 1, previous: this.tip,
      position: this.game.fen, action,
    };
    if (action.type === 'move') {
      const error = this.game.play(action.move.from[0], action.move.from[1])(action.move.to[0], action.move.to[1], action.move.promotion);
      if (error !== null) return false;
    }
    let packet: Packet;
    try {
      packet = this.sign(step);
      if (this.send({ kind: 'chess', packet }) === false) throw new Error('Peer disconnected');
    } catch {
      if (action.type === 'move') this.game.undo();
      this.log('Move not sent: peer disconnected');
      return false;
    }
    this.commit(step, packet);
    return true;
  }

  receive(message: unknown): void {
    if (this.phase === ChessPhase.Closed || this.phase === ChessPhase.Failed) return;
    if (!message || typeof message !== 'object' || !('kind' in message) || message.kind !== 'chess') return;
    const packet = 'packet' in message ? message.packet as Packet : null;
    if (!packet || typeof packet.body !== 'string' || typeof packet.signature !== 'string'
      || !this.peerKey?.verifies(packet.body, packet.signature)) {
      this.fail('Invalid peer signature');
      return;
    }
    let value: Record<string, unknown>;
    try {
      const decoded: unknown = JSON.parse(packet.body);
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error();
      value = decoded as Record<string, unknown>;
    } catch {
      this.fail('Invalid chess message');
      return;
    }
    if (value.version !== 1 || value.by !== 1 - this.seat || !validMatch(value.match)) {
      this.fail('Invalid chess sender or version');
      return;
    }
    if (value.kind === 'chess-ready') {
      this.remoteReady = Math.max(this.remoteReady, value.match);
      if (this.connected && this.phase === ChessPhase.Playing && value.match > this.matchNo) {
        this.requestMatch(value.match);
      }
      this.reconcile();
      this.onChange();
      return;
    }
    if (value.kind !== 'chess-step') { this.fail('Unknown chess action'); return; }
    if (value.match < this.matchNo || this.seen.has(digest(packet.body))) return;
    if (!this.connected || this.phase !== ChessPhase.Playing || value.match !== this.matchNo
      || value.sequence !== this.sequence + 1 || value.previous !== this.tip
      || value.position !== this.game.fen) {
      this.fail('Peer state or sequence mismatch');
      return;
    }
    const action = value.action as Action | undefined;
    if (action?.type === 'move') {
      if (this.currentTurnSeat() !== value.by || !isSquare(action.move?.from) || !isSquare(action.move?.to)) {
        this.fail('Invalid move or wrong player turn');
        return;
      }
      const error = this.game.play(action.move.from[0], action.move.from[1])(action.move.to[0], action.move.to[1], action.move.promotion);
      if (error !== null) { this.fail(`Peer move rejected: ${error}`); return; }
    } else if (action?.type !== 'resign') {
      this.fail('Unknown chess action');
      return;
    }
    this.commit(value as unknown as Step, packet);
  }

  private sign(value: Ready | Step): Packet {
    const body = JSON.stringify(value);
    return { body, signature: this.identity.sign(body) };
  }
  private publish(value: Ready): boolean {
    try { return this.send({ kind: 'chess', packet: this.sign(value) }) !== false; }
    catch { this.log('Readiness could not be sent'); return false; }
  }

  private commit(step: Step, packet: Packet): void {
    this.sequence = step.sequence;
    this.tip = digest(packet.body);
    this.seen.add(this.tip);
    if (step.action.type === 'move') {
      const move = step.action.move;
      this.moves = [...this.moves, {
        from: squareName(move.from), to: squareName(move.to), by: step.by,
        signature: packet.signature, sequence: step.sequence, digest: this.tip, verified: true,
      }];
      this.log(`${step.by === this.seat ? 'Me' : 'Them'}: ${squareName(move.from)} → ${squareName(move.to)}`);
      if (this.game.lastOutcome === CheckMate || this.game.lastOutcome === Stalemate || this.game.lastOutcome === Draw) {
        this.lastResult = {
          winner: this.game.lastOutcome === CheckMate ? step.by : null,
          reason: this.game.lastOutcome === CheckMate ? 'checkmate' : this.game.lastOutcome === Stalemate ? 'stalemate' : 'draw',
        };
        this.transition(ChessPhase.Ended);
      }
    } else {
      this.lastResult = { winner: (1 - step.by) as Seat, reason: 'resignation' };
      this.transition(ChessPhase.Ended);
    }
    this.onChange();
  }

  private transition(phase: ChessPhase): void { this.phase = phase; this.onChange(); }
  private fail(reason: string): void {
    this.error = reason;
    this.log(`Chess stopped: ${reason}`);
    this.transition(ChessPhase.Failed);
  }

  view() {
    return {
      phase: this.phase, matchNo: this.matchNo, seat: this.seat, turn: this.currentTurnSeat(),
      snapshot: boardCharacters(this.game.recent), position: this.game.fen,
      legalMoves: this.phase === ChessPhase.Playing ? this.game.legalMoves()
        .map((move) => ({ from: squareName(move.from), to: squareName(move.to), promotion: move.promotion })) : [],
      history: this.moves, lastResult: this.lastResult, isMyTurn: this.isMyTurn(),
      inCheck: this.game.lastOutcome === Check || this.game.lastOutcome === CheckMate,
      outcome: this.game.lastOutcome, error: this.error,
      iWantRematch: this.phase === ChessPhase.Ended && this.localReady > this.matchNo,
      peerWantsRematch: this.phase === ChessPhase.Ended && this.remoteReady > this.matchNo,
    };
  }
}
