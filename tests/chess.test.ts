import assert from 'node:assert/strict';
import test from 'node:test';
import * as Chess from '../src/lib/chess/Chess';
import { ChessPhase, ChessSession, Resignation } from '../src/lib/chess/ChessSession';
import { boardLetters, promotionAt, squareAt, squareName } from '../src/lib/chess/Notation';
import { WireCodec } from '../src/lib/meet/WireCodec.js';

const FEN_PIECES: Record<string, Chess.Piece> = {
  k: Chess.King, q: Chess.Queen, r: Chess.Rook, b: Chess.Bishop, n: Chess.Knight, p: Chess.Pawn,
};

/** Board from the piece placement field of a FEN string. */
function fenBoard(placement: string): Chess.Board {
  return placement.split('/').map((rank) => [...rank].flatMap((symbol): Chess.MaybeColorPiece[] => (/\d/.test(symbol)
    ? Array(Number(symbol)).fill(null)
    : [[symbol === symbol.toUpperCase() ? Chess.White : Chess.Black, FEN_PIECES[symbol.toLowerCase()]]])));
}

/** One rank as text, '.' for vacant squares. */
function rankText(board: Chess.Board, rank: number): string {
  return boardLetters(board)[8 - rank].map((letter) => letter ?? '.').join('');
}

function play(game: Chess.Game, from: string, to: string, promotion?: Chess.Piece) {
  const source = squareAt(from) as Chess.Square;
  const target = squareAt(to) as Chess.Square;
  return game.play(source[0], source[1])(target[0], target[1], promotion);
}

function san(game: Chess.Game, from: string, to: string, promotion?: Chess.Piece): string {
  const source = squareAt(from) as Chess.Square;
  const target = squareAt(to) as Chess.Square;
  const notation = Chess.san({ from: source, to: target, ...(promotion ? { promotion } : {}) })(game.turn)(game.history);
  assert.equal(game.play(source[0], source[1])(target[0], target[1], promotion), null);
  return notation;
}

function playAll(game: Chess.Game, moves: string): void {
  for (const move of moves.split(' ')) assert.equal(play(game, move.slice(0, 2), move.slice(2, 4)), null, move);
}

function perft(color: Chess.Color, history: Chess.History, depth: number): number {
  const moves = Chess.legalMoves(color)(history);
  if (depth === 1) return moves.length;
  return moves.reduce((nodes, move) => {
    const board = Chess.makeMove(move.from[0], move.from[1])(move.to[0], move.to[1], move.promotion)(color)(history) as Chess.Board;
    return nodes + perft(Chess.oppositeColor(color), [...history, board], depth - 1);
  }, 0);
}

test('the board, colors, pieces and Game keep the Scala layout and accessors', () => {
  assert.deepEqual([8, 7, 6, 5, 4, 3, 2, 1].map((rank) => rankText(Chess.newBoard, rank)), [
    'rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR',
  ]);
  assert.deepEqual(Chess.White.initialRanks, [7, 6]);
  assert.deepEqual(Chess.Black.initialRanks, [0, 1]);
  assert.equal(new Set(Chess.Knight.validMoves.map(String)).size, 8, 'Scala repeated some Knight vectors and missed others');
  const game = new Chess.Game();
  assert.equal(game.recent, Chess.newBoard);
  assert.equal(game.turn, Chess.White);
  assert.equal(game.previousTurn, null);
  assert.equal(game.lastOutcome, Chess.NextPlayer);
  assert.equal(game.ply, 0);
  assert.equal(game.apply((board) => board[6][4]?.[1]), Chess.Pawn);
  assert.equal(game.legalMoves().length, 20);
});

test('vector and path helpers follow the Scala conventions', () => {
  assert.deepEqual(Chess.moveVector(6, 4)(4, 4)(Chess.White), [2, 0]);
  assert.deepEqual(Chess.moveVector(1, 4)(3, 4)(Chess.Black), [2, 0]);
  assert.deepEqual(Chess.normalizeVector([-5, 3]), [-1, 1]);
  assert.equal(Chess.oppositeColor(Chess.White), Chess.Black);
  assert.deepEqual(Chess.nextSquare(6, 4)(Chess.White)([2, 0]), [4, 4]);
  assert.deepEqual(Chess.nextSquare(1, 4)(Chess.Black)([2, 0]), [3, 4]);
  assert.deepEqual(Chess.nextVector([1, 2])([3, -1]), [4, 1]);
  assert.deepEqual(Chess.distanceVector(6, 4)(4, 4), [-2, 0]);
  assert.deepEqual(Chess.createPath(7, 0)(4, 3), [[7, 0], [6, 1], [5, 2], [4, 3]]);
  assert.equal(Chess.isPathBlocked(7, 0)(4, 3)(Chess.newBoard), true);
  assert.equal(Chess.isPathBlocked(6, 4)(4, 4)(Chess.newBoard), false);
  assert.deepEqual(Chess.findPathBlocker(4, 4)(Chess.White)([1, 0])(Chess.newBoard), [[Chess.Black, Chess.Pawn], [1, 4]]);
  assert.deepEqual(Chess.findPathBlocker(7, 0)(Chess.White)([1, -1])(Chess.newBoard), [[Chess.White, Chess.Pawn], [6, 1]]);
  assert.equal(Chess.findPathBlocker(7, 0)(Chess.White)([1, 1])(Chess.newBoard), null);
  assert.equal(Chess.isValidSquare([7, 7]), true);
  assert.equal(Chess.isValidSquare(8, 0), false);
  assert.equal(Chess.isValidSquare(0, 1.5), false);
  assert.equal(Chess.isSquareVacant(Chess.newBoard)([4, 4]), true);
  assert.equal(Chess.isOccupied(6, 4)(Chess.White)(Chess.newBoard), true);
  assert.equal(Chess.isOccupied(6, 4)(Chess.Black)(Chess.newBoard), false);
});

test('Game.play returns invalid moves as values, and undo restores board, turn and outcome', () => {
  const game = new Chess.Game();
  assert.equal(game.play(9, 0)(0, 0), Chess.InvalidLocation);
  assert.equal(game.play(4, 4)(3, 4), Chess.NoPiece);
  assert.equal(game.play(1, 4)(3, 4), Chess.NoPlayerTurn);
  assert.equal(game.play(7, 0)(6, 0), Chess.AlreadyOccupied);
  assert.equal(game.play(7, 0)(5, 0), Chess.MoveBlocked);
  assert.equal(game.play(6, 0)(3, 0), Chess.NoMove);
  assert.equal(game.ply, 0, 'invalid moves leave no history');
  assert.equal(game.play(6, 4)(4, 4), null);
  assert.equal(Chess.newBoard[6][4]?.[1], Chess.Pawn, 'boards never change in place');
  assert.equal(game.turn, Chess.Black);
  assert.equal(game.previousTurn, Chess.White);
  const afterFirst = game.recent;
  assert.equal(game.play(1, 4)(3, 4), null);
  game.undo();
  assert.equal(game.recent, afterFirst);
  assert.equal(game.turn, Chess.Black);
  game.undo();
  game.undo();
  assert.equal(game.recent, Chess.newBoard);
  assert.equal(game.turn, Chess.White);
  assert.equal(game.lastOutcome, Chess.NextPlayer);
});

test('the Scala Main example plays the same way', () => {
  const game = new Chess.Game();
  assert.equal(game.play(7, 6)(5, 5), null);
  assert.equal(game.play(0, 6)(2, 5), null);
  assert.equal(game.play(0, 2)(5, 0), Chess.NoPlayerTurn);
  assert.equal(game.play(7, 7)(7, 6), null);
  assert.equal(game.play(0, 7)(0, 2), Chess.AlreadyOccupied);
});

test('pawns step onto vacant squares, double step only from the start, and kill only diagonally', () => {
  const start = fenBoard('4k3/8/8/8/n7/8/P1P5/4K3');
  assert.equal(Chess.movePawn(6, 0)(4, 0)(Chess.White)(start), Chess.MoveBlocked, 'Scala let a double step land on a piece');
  const game = new Chess.Game(start);
  assert.equal(play(game, 'a2', 'b3'), Chess.NoPawnMove, 'a Pawn kills only an opponent piece');
  assert.equal(play(game, 'c2', 'c5'), Chess.NoMove);
  assert.equal(play(game, 'c2', 'c4'), null);
  assert.equal(play(game, 'e8', 'd8'), null);
  assert.equal(play(game, 'c4', 'c6'), Chess.NoPawnMove, 'a double step only from the initial rank');
  const facing = new Chess.Game(fenBoard('4k3/8/8/3pp3/4P3/8/8/4K3'));
  assert.equal(play(facing, 'e4', 'e5'), Chess.MoveBlocked);
  assert.equal(play(facing, 'e4', 'd5'), null);
});

test('a Pawn promotes to any of four pieces, on a step or a kill (Scala: only on a step, always a Queen)', () => {
  const position = '1r5k/P7/8/8/8/8/8/4K3';
  for (const piece of Chess.promotions) {
    const game = new Chess.Game(fenBoard(position));
    assert.equal(play(game, 'a7', 'a8', piece), null);
    assert.equal(game.recent[0][0]?.[1], piece);
  }
  const kill = new Chess.Game(fenBoard(position));
  assert.equal(play(kill, 'a7', 'b8', Chess.Knight), null);
  assert.deepEqual(kill.recent[0][1], [Chess.White, Chess.Knight]);
  assert.equal(play(new Chess.Game(fenBoard(position)), 'a7', 'a8', Chess.King), Chess.NoPawnMove);
});

test('sliding pieces move along straight lines only (Scala let a Bishop move like a Knight)', () => {
  const board = fenBoard('4k3/8/8/8/3B4/8/8/4K3');
  assert.equal(Chess.movePieceVariable(4, 3)(2, 4)(Chess.White, Chess.Bishop)(board), Chess.NoMove);
  assert.equal(Chess.isInvalid(Chess.movePieceVariable(4, 3)(1, 6)(Chess.White, Chess.Bishop)(board)), false);
});

test('no move may leave the King in check, and the Kings never stand side by side', () => {
  const pinned = new Chess.Game(fenBoard('4r2k/8/8/8/8/8/4R3/4K3'));
  assert.equal(play(pinned, 'e2', 'd2'), Chess.KingInCheck);
  assert.equal(play(pinned, 'e2', 'e8'), null, 'the pinned Rook may kill along the pin');
  const kings = new Chess.Game(fenBoard('8/8/8/8/8/4k3/8/R3K3'));
  assert.equal(play(kings, 'e1', 'e2'), Chess.KingInCheck, 'Scala let the Kings stand side by side');
  const retreat = new Chess.Game(fenBoard('4r2k/8/8/8/4K3/8/8/8'));
  assert.equal(retreat.lastOutcome, Chess.Check);
  assert.equal(play(retreat, 'e4', 'e3'), Chess.KingInCheck, 'Scala took a step along the checking line for an escape');
  assert.equal(play(retreat, 'e4', 'd4'), null);
});

test('checkmate looks at every reply: a block or a kill saves the King (Scala looked only at its escapes)', () => {
  assert.equal(new Chess.Game(fenBoard('6k1/8/8/8/8/8/5PPP/r5K1')).lastOutcome, Chess.CheckMate);
  const block = new Chess.Game(fenBoard('6k1/8/8/8/8/8/3B1PPP/r5K1'));
  assert.equal(block.lastOutcome, Chess.Check);
  assert.equal(play(block, 'd2', 'e1'), null);
  const kill = new Chess.Game(fenBoard('6k1/R7/8/8/8/8/5PPP/r5K1'));
  assert.equal(kill.lastOutcome, Chess.Check);
  assert.equal(play(kill, 'a7', 'a1'), null);
  const fool = new Chess.Game();
  playAll(fool, 'f2f3 e7e5 g2g4 d8h4');
  assert.equal(fool.lastOutcome, Chess.CheckMate);
  assert.equal(play(fool, 'e2', 'e4'), Chess.GameOver);
  fool.undo();
  assert.equal(fool.lastOutcome, Chess.NextPlayer);
  assert.equal(fool.turn, Chess.Black);
});

test('stalemate: no legal move and no check', () => {
  const game = new Chess.Game(fenBoard('7k/5K2/6Q1/8/8/8/8/8'), Chess.Black);
  assert.equal(game.lastOutcome, Chess.Stalemate);
  assert.deepEqual(game.legalMoves(), []);
  assert.equal(play(game, 'h8', 'g8'), Chess.GameOver);
});

test('castling on both sides, never out of or through check, never after the King or Rook moved', () => {
  const both = 'r3k2r/8/8/8/8/8/8/R3K2R';
  const game = new Chess.Game(fenBoard(both));
  assert.equal(play(game, 'e1', 'g1'), null);
  assert.equal(rankText(game.recent, 1), 'R....RK.');
  game.undo();
  assert.equal(play(game, 'e1', 'c1'), null);
  assert.equal(rankText(game.recent, 1), '..KR...R');
  assert.equal(play(game, 'e8', 'g8'), null);
  assert.equal(rankText(game.recent, 8), 'r....rk.');
  const attacked = 'r3k2r/8/8/8/2b5/8/8/R3K2R';
  assert.equal(play(new Chess.Game(fenBoard(attacked)), 'e1', 'g1'), Chess.KingInCheck, 'the Bishop watches f1');
  assert.equal(play(new Chess.Game(fenBoard(attacked)), 'e1', 'c1'), null);
  assert.equal(play(new Chess.Game(fenBoard('4k3/8/8/8/4r3/8/8/R3K2R')), 'e1', 'g1'), Chess.KingInCheck, 'not out of check');
  assert.equal(play(new Chess.Game(), 'e1', 'g1'), Chess.MoveBlocked);
  const moved = new Chess.Game(fenBoard(both));
  playAll(moved, 'h1h2 a8a7 h2h1 a7a8');
  assert.equal(play(moved, 'e1', 'g1'), Chess.NoCastling, 'the Rook went away and back');
  assert.equal(play(moved, 'e1', 'c1'), null);
  assert.equal(play(moved, 'e8', 'c8'), Chess.NoCastling);
  assert.equal(play(moved, 'e8', 'g8'), null);
});

test('en passant kills the passing Pawn, right after its double step only', () => {
  const game = new Chess.Game(fenBoard('4k3/5p2/8/4P3/8/8/8/4K3'), Chess.Black);
  assert.equal(play(game, 'f7', 'f5'), null);
  assert.equal(play(game, 'e5', 'f6'), null);
  assert.equal(rankText(game.recent, 5), '........');
  assert.equal(rankText(game.recent, 6), '.....P..');
  game.undo();
  playAll(game, 'e1d1 e8d8');
  assert.equal(play(game, 'e5', 'f6'), Chess.NoPawnMove, 'too late');
});

test('draws: insufficient material, fifty quiet moves, and the third repetition with the same castling rights', () => {
  assert.equal(new Chess.Game(fenBoard('4k3/8/8/8/8/8/8/4K3')).lastOutcome, Chess.InsufficientMaterial);
  assert.equal(new Chess.Game(fenBoard('4k3/8/8/8/8/8/8/2N1K3')).lastOutcome, Chess.InsufficientMaterial);
  assert.equal(new Chess.Game(fenBoard('4kb2/8/8/8/8/8/8/2B1K3')).lastOutcome, Chess.InsufficientMaterial, 'Bishops on one color');
  assert.equal(new Chess.Game(fenBoard('2b1k3/8/8/8/8/8/8/2B1K3')).lastOutcome, Chess.NextPlayer, 'Bishops on both colors');

  const quiet = fenBoard('4k3/8/8/8/8/8/8/R3K3');
  assert.equal(Chess.quietPlies(Array(100).fill(quiet)), 99);
  assert.equal(Chess.outcome(Chess.White)(Array(101).fill(quiet)), Chess.FiftyMoves);
  assert.equal(Chess.quietPlies([...Array(60).fill(quiet), fenBoard('4k3/8/8/8/8/8/8/4K3')]), 0, 'a kill starts the count again');

  const knights = new Chess.Game();
  playAll(knights, 'g1f3 g8f6 f3g1 f6g8');
  assert.equal(knights.lastOutcome, Chess.NextPlayer, 'the second time');
  playAll(knights, 'g1f3 g8f6 f3g1 f6g8');
  assert.equal(knights.lastOutcome, Chess.Repetition);
  assert.equal(play(knights, 'e2', 'e4'), Chess.GameOver);

  const kings = new Chess.Game(fenBoard('r3k2r/8/8/8/8/8/8/R3K2R'));
  playAll(kings, 'e1f1 e8f8 f1e1 f8e8 e1f1 e8f8 f1e1 f8e8');
  assert.equal(kings.lastOutcome, Chess.NextPlayer, 'the first time, both players could still castle');
  playAll(kings, 'e1f1 e8f8');
  assert.equal(kings.lastOutcome, Chess.Repetition);
});

test('move generation matches the published perft node counts', () => {
  const positions: [string, number[]][] = [
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', [20, 400, 8902]],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R', [48, 2039]],
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8', [14, 191, 2812]],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1', [6, 264]],
    ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R', [44, 1486]],
  ];
  for (const position of positions) {
    position[1].forEach((nodes, index) => {
      assert.equal(perft(Chess.White, [fenBoard(position[0])], index + 1), nodes, `${position[0]} at depth ${index + 1}`);
    });
  }
});

test('algebraic names map to the Scala coordinates', () => {
  assert.equal(squareName([0, 0]), 'a8');
  assert.equal(squareName([7, 7]), 'h1');
  assert.deepEqual(squareAt('e2'), [6, 4]);
  assert.equal(squareAt('i1'), null);
  assert.equal(squareAt(42), null);
  assert.equal(promotionAt('N'), Chess.Knight);
  assert.equal(promotionAt('K'), null);
  assert.equal(promotionAt('constructor'), null);
});

test('standard algebraic notation covers moves, captures, checks, castling, promotions and ambiguity', () => {
  const opening = new Chess.Game();
  assert.equal(san(opening, 'e2', 'e4'), 'e4');
  assert.equal(san(opening, 'd7', 'd5'), 'd5');
  assert.equal(san(opening, 'e4', 'd5'), 'exd5');

  const checked = new Chess.Game();
  playAll(checked, 'e2e4 e7e5 d1h5');
  assert.equal(san(checked, 'b8', 'c6'), 'Nc6');
  assert.equal(san(checked, 'h5', 'e5'), 'Qxe5+');

  const mate = new Chess.Game();
  playAll(mate, 'f2f3 e7e5 g2g4');
  assert.equal(san(mate, 'd8', 'h4'), 'Qh4#');

  assert.equal(san(new Chess.Game(fenBoard('4k2r/8/8/8/8/8/8/4K2R')), 'e1', 'g1'), 'O-O');
  assert.equal(san(new Chess.Game(fenBoard('4k3/8/8/8/8/8/8/R3K3')), 'e1', 'c1'), 'O-O-O');
  assert.equal(san(new Chess.Game(fenBoard('7k/P7/8/8/8/8/8/K7')), 'a7', 'a8', Chess.Knight), 'a8=N');
  assert.equal(san(new Chess.Game(fenBoard('4k3/8/8/8/8/8/8/1N2KN2')), 'b1', 'd2'), 'Nbd2');
  assert.equal(san(new Chess.Game(fenBoard('4k3/8/8/8/8/1N6/8/1N2K3')), 'b1', 'd2'), 'N1d2');
});

/** Two chess seats wired through ordered queues that round-trip the wire codec. */
function table() {
  const queues: unknown[][] = [[], []];
  const online = [true, true];
  const seatAt = (seat: 0 | 1) => new ChessSession({
    seat,
    send: (message) => {
      if (!online[seat]) return false;
      queues[1 - seat].push(WireCodec.decode(WireCodec.encode(message)));
      return true;
    },
  });
  const seats = [seatAt(0), seatAt(1)];
  const flush = () => {
    for (let round = 0; queues[0].length > 0 || queues[1].length > 0; round += 1) {
      assert.ok(round < 50, 'messages settle');
      for (const seat of [0, 1]) for (const message of queues[seat].splice(0)) seats[seat].receive(message);
    }
  };
  return { seats, queues, online, flush, reload: (seat: 0 | 1) => { seats[seat] = seatAt(seat); } };
}

function connectedTable() {
  const pipe = table();
  pipe.seats.forEach((session) => session.connect());
  pipe.flush();
  return pipe;
}

function move(pipe: ReturnType<typeof table>, seat: 0 | 1, text: string): void {
  assert.equal(pipe.seats[seat].submitMove({ from: text.slice(0, 2), to: text.slice(2, 4) }), true, text);
  pipe.flush();
}

test('the seats start a game when their links come up, also when one hello arrives early', () => {
  const pipe = table();
  pipe.seats[0].connect();
  pipe.flush();
  assert.equal(pipe.seats[1].phase, ChessPhase.Idle, 'the early hello waits for the link');
  pipe.seats[1].connect();
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Playing);
    assert.equal(session.matchNo, 1);
  }
  assert.equal(pipe.seats[0].view().isMyTurn, true, 'the host plays White');
  assert.equal(pipe.seats[0].view().legalMoves.length, 20);
  assert.deepEqual(pipe.seats[1].view().legalMoves, []);
});

test('moves alternate and both replicas agree on checkmate', () => {
  const pipe = connectedTable();
  move(pipe, 0, 'f2f3');
  move(pipe, 1, 'e7e5');
  move(pipe, 0, 'g2g4');
  move(pipe, 1, 'd8h4');
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Ended);
    assert.deepEqual(session.result, { winner: 1, reason: Chess.CheckMate });
    assert.equal(session.view().check, 'e1');
  }
  assert.deepEqual(pipe.seats[0].view().board, pipe.seats[1].view().board);
  assert.deepEqual(pipe.seats[0].history, pipe.seats[1].history);
  assert.deepEqual(pipe.seats[1].history.map((played) => played.by), [0, 1, 0, 1]);
});

test('a seat cannot move for the other seat, nor play an invalid move', () => {
  const pipe = connectedTable();
  assert.equal(pipe.seats[1].submitMove({ from: 'e7', to: 'e5' }), false);
  assert.equal(pipe.seats[0].submitMove({ from: 'e2', to: 'e5' }), false);
  assert.equal(pipe.seats[0].submitMove({ from: 'x9', to: 'e4' }), false);
  assert.deepEqual(pipe.queues, [[], []]);
});

test('a move out of turn, out of order, unreadable or invalid stops the game without changing it', () => {
  const cases: [0 | 1, object][] = [
    [0, { kind: 'chess-move', match: 1, ply: 0, from: 'e7', to: 'e5' }],
    [1, { kind: 'chess-move', match: 1, ply: 3, from: 'e2', to: 'e4' }],
    [1, { kind: 'chess-move', match: 1, ply: 0, from: 'e2', to: 'z4' }],
    [1, { kind: 'chess-move', match: 1, ply: 0, from: 'e2', to: 'e5' }],
  ];
  for (const each of cases) {
    const pipe = connectedTable();
    const session = pipe.seats[each[0]];
    session.receive(each[1]);
    assert.equal(session.phase, ChessPhase.Failed, JSON.stringify(each[1]));
    assert.equal(session.game.ply, 0);
    assert.ok(session.error);
  }
});

test('moves of an earlier game are ignored', () => {
  const pipe = connectedTable();
  pipe.seats[1].receive({ kind: 'chess-move', match: 0, ply: 0, from: 'e2', to: 'e4' });
  assert.equal(pipe.seats[1].phase, ChessPhase.Playing);
  assert.equal(pipe.seats[1].game.ply, 0);
});

test('either seat may resign on any turn, and both seats see the result', () => {
  const pipe = connectedTable();
  assert.equal(pipe.seats[1].resign(), true, 'Black resigns on White’s turn');
  pipe.flush();
  for (const session of pipe.seats) assert.deepEqual(session.result, { winner: 0, reason: Resignation });
});

test('resigning at the same moment is a draw on both seats', () => {
  const pipe = connectedTable();
  pipe.seats[0].resign();
  pipe.seats[1].resign();
  pipe.flush();
  for (const session of pipe.seats) assert.deepEqual(session.result, { winner: null, reason: Resignation });
});

test('a new game starts only when both seats ask for it', () => {
  const pipe = connectedTable();
  pipe.seats[1].resign();
  pipe.flush();
  assert.equal(pipe.seats[0].requestRematch(), true);
  pipe.flush();
  assert.equal(pipe.seats[1].view().peerWantsRematch, true);
  assert.equal(pipe.seats[0].view().iWantRematch, true);
  assert.equal(pipe.seats[0].phase, ChessPhase.Ended);
  assert.equal(pipe.seats[1].requestRematch(), true);
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Playing);
    assert.equal(session.matchNo, 2);
    assert.equal(session.view().whiteSeat, 1, 'a rematch reverses the players’ colors');
    assert.equal(session.game.ply, 0);
    assert.equal(session.result, null);
  }
  assert.equal(pipe.seats[1].view().isMyTurn, true, 'Black from the first game opens the rematch as White');
  assert.equal(pipe.seats[0].view().isMyTurn, false);
});

test('the promotion choice travels with the move', () => {
  const pipe = connectedTable();
  for (const session of pipe.seats) session.game = new Chess.Game(fenBoard('7k/P6p/8/8/8/8/8/K7'));
  assert.equal(pipe.seats[0].submitMove({ from: 'a7', to: 'a8', promotion: 'N' }), true);
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.game.recent[0][0]?.[1], Chess.Knight);
    assert.deepEqual(session.history, [{ by: 0, from: 'a7', to: 'a8', promotion: 'N', san: 'a8=N' }]);
  }
});

test('a dropped link resumes the same game when both seats kept it', () => {
  const pipe = connectedTable();
  move(pipe, 0, 'e2e4');
  move(pipe, 1, 'e7e5');
  pipe.seats.forEach((session) => session.disconnect());
  assert.equal(pipe.seats[0].submitMove({ from: 'g1', to: 'f3' }), false);
  pipe.seats.forEach((session) => session.connect());
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Playing);
    assert.equal(session.matchNo, 1);
    assert.equal(session.game.ply, 2);
  }
  move(pipe, 0, 'g1f3');
});

test('one seat reconnecting on its own resumes the game', () => {
  const pipe = connectedTable();
  move(pipe, 0, 'd2d4');
  pipe.seats[1].disconnect();
  pipe.seats[1].connect();
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Playing);
    assert.equal(session.matchNo, 1);
  }
  move(pipe, 1, 'd7d5');
});

test('a seat that lost its game in a reload makes both seats start a new one', () => {
  const pipe = connectedTable();
  move(pipe, 0, 'e2e4');
  pipe.reload(1);
  pipe.seats[1].connect();
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Playing);
    assert.equal(session.matchNo, 2);
    assert.equal(session.game.ply, 0);
  }
});

test('a move that cannot be sent is taken back', () => {
  const pipe = connectedTable();
  pipe.online[0] = false;
  assert.equal(pipe.seats[0].submitMove({ from: 'e2', to: 'e4' }), false);
  assert.equal(pipe.seats[0].game.ply, 0);
  assert.deepEqual(pipe.seats[0].history, []);
  pipe.online[0] = true;
  assert.equal(pipe.seats[0].submitMove({ from: 'e2', to: 'e4' }), true);
});

test('a stopped game recovers when both seats agree on a new one', () => {
  const pipe = connectedTable();
  pipe.seats[1].receive({ kind: 'chess-move', match: 1, ply: 0, from: 'e2', to: 'e5' });
  assert.equal(pipe.seats[1].phase, ChessPhase.Failed);
  assert.equal(pipe.seats[1].requestRematch(), true);
  pipe.flush();
  assert.equal(pipe.seats[0].view().peerWantsRematch, true, 'the other seat is asked even mid-game');
  assert.equal(pipe.seats[0].requestRematch(), true);
  pipe.flush();
  for (const session of pipe.seats) {
    assert.equal(session.phase, ChessPhase.Playing);
    assert.equal(session.matchNo, 2);
    assert.equal(session.error, null);
  }
});
