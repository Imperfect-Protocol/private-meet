import { Check, CheckMate, Game, Pawn, White, isGameOver, kingSquare, san, type InvalidMove, type Outcome, type Piece, type Square } from './Chess';
import { boardLetters, promotionAt, squareAt, squareName } from './Notation';

/** Lifecycle of chess at a meeting table. Initial: Idle. Final: Closed. Error: Failed. */
export const ChessPhase = Object.freeze({
  /** Created; the link to the other seat is not up yet. */
  Idle: 'Idle',
  /** The link is up; waiting for the other seat's hello to resume the game or start a new one. */
  AwaitingPeer: 'AwaitingPeer',
  Playing: 'Playing',
  /** Checkmate, draw or resignation; the seats may agree on a new game. */
  Ended: 'Ended',
  /** The link is down; the game is kept so both seats can resume it. */
  Disconnected: 'Disconnected',
  /** The other seat sent a move this replica cannot accept; the seats may agree on a new game. */
  Failed: 'Failed',
  Closed: 'Closed',
} as const);
export type ChessPhase = (typeof ChessPhase)[keyof typeof ChessPhase];

export type Seat = 0 | 1;
export const Resignation = 'Resignation';

/** A move by square names; the promotion letter only when a Pawn reaches the last rank. */
export interface ChessMove {
  readonly from: string;
  readonly to: string;
  readonly promotion?: string;
}

/** A played move and the seat that played it. */
export interface PlayedMove extends ChessMove {
  readonly by: Seat;
  /** Standard Algebraic Notation, derived from the position before this move. */
  readonly san: string;
}

/** How a game ended. A draw has no winner. */
export interface ChessResult {
  readonly winner: Seat | null;
  readonly reason: Outcome | typeof Resignation;
}

/** What the chess table shows. */
export interface ChessView {
  readonly phase: ChessPhase;
  readonly matchNo: number;
  readonly seat: Seat;
  /** Seat playing White in this game. The initial game gives White to the host. */
  readonly whiteSeat: Seat;
  readonly turn: Seat;
  readonly isMyTurn: boolean;
  /** FEN letters by rank, rank 8 first; null for vacant squares. */
  readonly board: (string | null)[][];
  /** Legal moves while it is this seat's turn. */
  readonly legalMoves: readonly ChessMove[];
  readonly history: readonly PlayedMove[];
  /** Square of the King in check. */
  readonly check: string | null;
  readonly result: ChessResult | null;
  readonly error: string | null;
  readonly iWantRematch: boolean;
  readonly peerWantsRematch: boolean;
}

/** A seat's game as it announces it when its link comes up; equal games are resumed. */
interface Hello {
  readonly match: number;
  readonly ply: number;
  readonly ended: boolean;
  readonly failed: boolean;
}

/** Agreement on a new game: it starts once both seats ask for it. */
interface Rematch {
  local: boolean;
  remote: boolean;
}

/** A named move resolved against the board on the table. */
interface ResolvedMove {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: Piece;
  readonly notation: ChessMove;
}

interface Options {
  readonly seat: Seat;
  readonly send: (message: object) => boolean;
  readonly onChange?: () => void;
  readonly log?: (line: string) => void;
}

type Fields = Readonly<Record<string, unknown>>;

const Message = Object.freeze({
  Hello: 'chess-hello',
  Move: 'chess-move',
  Resign: 'chess-resign',
  Rematch: 'chess-rematch',
});

const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
const noRematch = (): Rematch => ({ local: false, remote: false });

/**
 * Chess between the two seats of a meeting. The meeting link signs and verifies every message;
 * this session keeps the two Game replicas in step. A move counts only when it is the sender's
 * turn, at the expected ply, and legal. The host (seat 0) plays White in the
 * initial game; agreed rematches swap the colors.
 */
export class ChessSession {
  readonly seat: Seat;
  phase: ChessPhase = ChessPhase.Idle;
  matchNo = 0;
  private whiteSeat: Seat = 0;
  game = new Game();
  history: PlayedMove[] = [];
  result: ChessResult | null = null;
  error: string | null = null;
  private readonly send: (message: object) => boolean;
  private readonly onChange: () => void;
  private readonly log: (line: string) => void;
  private pendingHello: Hello | null = null;
  private rematch: Rematch = noRematch();

  constructor(options: Options) {
    this.seat = options.seat;
    this.send = options.send;
    this.onChange = options.onChange ?? (() => {});
    this.log = options.log ?? (() => {});
  }

  /** Seat whose turn it is, according to the color assigned for this game. */
  turnSeat(): Seat {
    return this.game.turn === White ? this.whiteSeat : otherSeat(this.whiteSeat);
  }

  isMyTurn(): boolean {
    return this.phase === ChessPhase.Playing && this.turnSeat() === this.seat;
  }

  /** The link is up: announce this replica's game; the other seat's hello decides what follows. */
  connect(): void {
    if (this.phase !== ChessPhase.Idle && this.phase !== ChessPhase.Disconnected) return;
    this.transition(ChessPhase.AwaitingPeer);
    this.sendHello(false);
    const early = this.pendingHello;
    this.pendingHello = null;
    if (early) this.settle(early);
  }

  /** The link is down: keep the game so both seats can resume it. */
  disconnect(): void {
    if (this.phase === ChessPhase.Idle || this.phase === ChessPhase.Disconnected || this.phase === ChessPhase.Closed) return;
    this.rematch = noRematch();
    this.transition(ChessPhase.Disconnected);
  }

  close(): void {
    this.transition(ChessPhase.Closed);
  }

  /** Plays a move of this seat and sends it. False when it is not legal or cannot be sent. */
  submitMove(move: ChessMove): boolean {
    if (!this.isMyTurn()) return false;
    const ply = this.game.ply;
    const resolved = this.resolve(move);
    if (!resolved) return false;
    const notation = san(resolved)(this.game.turn)(this.game.history);
    if (this.play(resolved) !== null) return false;
    if (!this.send({ kind: Message.Move, match: this.matchNo, ply, ...resolved.notation })) {
      this.game.undo();
      this.log('Move not sent: the other player is not connected');
      return false;
    }
    this.record(this.seat, { ...resolved.notation, san: notation });
    return true;
  }

  /** Either seat may resign while the game is on, on any turn. */
  resign(): boolean {
    if (this.phase !== ChessPhase.Playing || !this.send({ kind: Message.Resign, match: this.matchNo })) return false;
    this.log('You resigned');
    this.finish({ winner: otherSeat(this.seat), reason: Resignation });
    return true;
  }

  /** Asks for a new game; it starts when the other seat asks too. */
  requestRematch(): boolean {
    if (!this.canRematch() || this.rematch.local) return false;
    if (!this.send({ kind: Message.Rematch, match: this.matchNo + 1 })) return false;
    this.rematch.local = true;
    this.startIfAgreed();
    return true;
  }

  receive(message: unknown): void {
    if (this.phase === ChessPhase.Closed || typeof message !== 'object' || message === null) return;
    const fields = message as Fields;
    if (fields.kind === Message.Hello) this.receiveHello(fields);
    else if (fields.kind === Message.Move) this.receiveMove(fields);
    else if (fields.kind === Message.Resign) this.receiveResign(fields);
    else if (fields.kind === Message.Rematch) this.receiveRematch(fields);
  }

  view(): ChessView {
    const myTurn = this.isMyTurn();
    const checked = this.game.lastOutcome === Check || this.game.lastOutcome === CheckMate;
    return {
      phase: this.phase,
      matchNo: this.matchNo,
      seat: this.seat,
      whiteSeat: this.whiteSeat,
      turn: this.turnSeat(),
      isMyTurn: myTurn,
      board: boardLetters(this.game.recent),
      legalMoves: myTurn
        ? this.game.legalMoves().map((move) => ({
          from: squareName(move.from),
          to: squareName(move.to),
          ...(move.promotion ? { promotion: move.promotion.code } : {}),
        }))
        : [],
      history: this.history,
      check: checked ? squareName(kingSquare(this.game.turn)(this.game.recent)) : null,
      result: this.result,
      error: this.error,
      iWantRematch: this.rematch.local,
      peerWantsRematch: this.rematch.remote,
    };
  }

  private receiveHello(fields: Fields): void {
    if (!isCount(fields.match) || !isCount(fields.ply)) return;
    const hello: Hello = { match: fields.match, ply: fields.ply, ended: fields.ended === true, failed: fields.failed === true };
    if (this.phase === ChessPhase.Idle || this.phase === ChessPhase.Disconnected) {
      this.pendingHello = hello;
      return;
    }
    // A first hello comes from a seat whose link just came up, and it needs this replica's state.
    // A reply settles only a seat that is still waiting for one.
    if (fields.reply !== true) this.sendHello(true);
    else if (this.phase !== ChessPhase.AwaitingPeer) return;
    this.settle(hello);
  }

  private receiveMove(fields: Fields): void {
    if (this.phase !== ChessPhase.Playing || fields.match !== this.matchNo) return;
    if (fields.ply !== this.game.ply || this.turnSeat() === this.seat) {
      this.fail('the other player moved out of turn');
      return;
    }
    const resolved = this.resolve(fields);
    const notation = resolved ? san(resolved)(this.game.turn)(this.game.history) : null;
    const error = resolved ? this.play(resolved) : 'unreadable';
    if (resolved === null || error !== null) {
      this.fail(`the other player sent an invalid move (${error})`);
      return;
    }
    this.record(otherSeat(this.seat), { ...resolved.notation, san: notation as string });
  }

  private receiveResign(fields: Fields): void {
    if (fields.match !== this.matchNo) return;
    if (this.phase === ChessPhase.Playing) {
      this.log('The other player resigned');
      this.finish({ winner: this.seat, reason: Resignation });
    } else if (this.phase === ChessPhase.Ended && this.result?.reason === Resignation && this.result.winner !== this.seat) {
      this.log('Both players resigned');
      this.finish({ winner: null, reason: Resignation });
    }
  }

  private receiveRematch(fields: Fields): void {
    if (fields.match !== this.matchNo + 1 || !this.canRematch()) return;
    this.rematch.remote = true;
    this.startIfAgreed();
  }

  private sendHello(reply: boolean): void {
    this.send({
      kind: Message.Hello,
      reply,
      match: this.matchNo,
      ply: this.game.ply,
      ended: this.result !== null,
      failed: this.error !== null,
    });
  }

  /** Both seats settle on the same two hellos: an equal, sound game resumes, anything else starts a new one. */
  private settle(peer: Hello): void {
    const resumable = this.matchNo > 0 && peer.match === this.matchNo && peer.ply === this.game.ply
      && peer.ended === (this.result !== null) && !peer.failed && this.error === null;
    if (!resumable) {
      this.start(Math.max(this.matchNo, peer.match) + 1);
      return;
    }
    this.rematch = noRematch();
    this.log(`Chess game ${this.matchNo} resumed`);
    this.transition(this.result ? ChessPhase.Ended : ChessPhase.Playing);
  }

  /** Start an initial/recovery game without changing the original color assignment. */
  private start(match: number): void {
    this.begin(match, this.whiteSeat);
  }

  /** Each agreed rematch reverses the players' colors. */
  private startRematch(match: number): void {
    this.begin(match, otherSeat(this.whiteSeat));
  }

  private begin(match: number, whiteSeat: Seat): void {
    this.matchNo = match;
    this.whiteSeat = whiteSeat;
    this.game = new Game();
    this.history = [];
    this.result = null;
    this.error = null;
    this.rematch = noRematch();
    this.log(`Chess game ${match} started; you play ${this.seat === this.whiteSeat ? 'White' : 'Black'}`);
    this.transition(ChessPhase.Playing);
  }

  private canRematch(): boolean {
    return this.phase === ChessPhase.Playing || this.phase === ChessPhase.Ended || this.phase === ChessPhase.Failed;
  }

  private startIfAgreed(): void {
    if (this.rematch.local && this.rematch.remote) this.startRematch(this.matchNo + 1);
    else this.onChange();
  }

  /** Squares of a named move. The promotion counts only for a Pawn reaching the last rank, a Queen if not given. */
  private resolve(move: { readonly from?: unknown; readonly to?: unknown; readonly promotion?: unknown }): ResolvedMove | null {
    const from = squareAt(move.from);
    const to = squareAt(move.to);
    if (!from || !to) return null;
    const promoting = this.game.recent[from[0]][from[1]]?.[1] === Pawn && (to[0] === 0 || to[0] === 7);
    if (!promoting) return { from, to, notation: { from: squareName(from), to: squareName(to) } };
    const promotion = promotionAt(move.promotion ?? 'Q');
    if (!promotion) return null;
    return { from, to, promotion, notation: { from: squareName(from), to: squareName(to), promotion: promotion.code } };
  }

  private play(move: ResolvedMove): InvalidMove | null {
    return this.game.play(move.from[0], move.from[1])(move.to[0], move.to[1], move.promotion);
  }

  private record(by: Seat, move: ChessMove & { readonly san: string }): void {
    this.history = [...this.history, { ...move, by }];
    this.log(`${by === this.seat ? 'You' : 'They'} played ${move.from}–${move.to}${move.promotion ? `=${move.promotion}` : ''}`);
    const outcome = this.game.lastOutcome;
    if (isGameOver(outcome)) this.finish({ winner: outcome === CheckMate ? by : null, reason: outcome });
    else this.onChange();
  }

  private finish(result: ChessResult): void {
    this.result = result;
    this.transition(ChessPhase.Ended);
  }

  private fail(reason: string): void {
    this.error = reason;
    this.log(`Chess stopped: ${reason}`);
    this.transition(ChessPhase.Failed);
  }

  private transition(phase: ChessPhase): void {
    this.phase = phase;
    this.onChange();
  }
}
