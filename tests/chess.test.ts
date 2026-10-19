import assert from 'node:assert/strict';
import test from 'node:test';
import * as Chess from '../src/lib/chess/Chess';
import { boardCharacters, squareCoordinates, squareName } from '../src/lib/chess/ChessPosition';
import { ChessSession, type ChessMessage } from '../src/lib/chess/ChessSession';
import { SessionIdentity, PeerKey } from '../src/lib/meet/SessionIdentity.js';

function boardWith(...placements: (readonly [string, Chess.Color, Chess.Piece])[]): Chess.Board {
  const rows: Chess.MaybeColorPiece[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const placement of placements) {
    const square = squareCoordinates(placement[0]);
    assert.ok(square);
    rows[square[0]][square[1]] = [placement[1], placement[2]];
  }
  return rows;
}

function play(game: Chess.Game, from: string, to: string) {
  const source = squareCoordinates(from);
  const destination = squareCoordinates(to);
  assert.ok(source && destination);
  return game.play(source[0], source[1])(destination[0], destination[1]);
}

test('Scala board layout, colors, pieces and initial Game accessors are preserved', () => {
  const game = new Chess.Game();
  assert.deepEqual(Chess.White.initialRanks, [7, 6]);
  assert.deepEqual(Chess.Black.initialRanks, [0, 1]);
  assert.deepEqual(game.recent, Chess.newBoard);
  assert.deepEqual(game.recent[0][4], [Chess.Black, Chess.King]);
  assert.deepEqual(game.recent[7][4], [Chess.White, Chess.King]);
  assert.equal(game.turn, Chess.White);
  assert.equal(game.previousTurn, null);
  assert.equal(game.lastOutcome, Chess.NextPlayer);
  assert.equal(game.apply((board) => board[6][4]?.[1]), Chess.Pawn);
  assert.equal(Chess.legalMoves(game.turn)(game.recent).length, 20);
  assert.equal(new Set(Chess.Knight.validMoves.map(String)).size, 8);
});

test('curried vector and path helpers match Scala coordinate conventions', () => {
  assert.deepEqual(Chess.moveVector(6, 4)(4, 4)(Chess.White), [2, 0]);
  assert.deepEqual(Chess.moveVector(1, 4)(3, 4)(Chess.Black), [2, 0]);
  assert.deepEqual(Chess.normalizeVector([-5, 3]), [-1, 1]);
  assert.equal(Chess.oppositeColor(Chess.White), Chess.Black);
  assert.deepEqual(Chess.nextSquare(6, 4)(Chess.White)([2, 0]), [4, 4]);
  assert.deepEqual(Chess.nextVector([1, 2])([3, -1]), [4, 1]);
  assert.deepEqual(Chess.distanceVector(6, 4)(4, 4), [-2, 0]);
  assert.deepEqual(Chess.createPath(7, 0)(4, 3), [[7, 0], [6, 1], [5, 2], [4, 3]]);
  assert.equal(Chess.isPathBlocked(7, 0)(4, 3)(Chess.newBoard), true);
  assert.deepEqual(Chess.findPathBlocker(7, 0)(Chess.White)([1, 0])(Chess.newBoard), [[Chess.White, Chess.Pawn], [6, 0]]);
  assert.deepEqual(Chess.findPathBlocker(7, 0)(Chess.White)([1, -1])(Chess.newBoard), [[Chess.White, Chess.Pawn], [6, 1]]);
  assert.equal(Chess.findPathBlocker(7, 0)(Chess.White)([1, 1])(Chess.newBoard), null);
  assert.equal(Chess.isValidSquare([7, 7]), true);
  assert.equal(Chess.isValidSquare(8, 0), false);
  assert.equal(Chess.isValidSquare(1.5, 0), false);
  assert.equal(Chess.isSquareVacant(Chess.newBoard)([4, 4]), true);
  assert.equal(Chess.isOccupied(6, 4)(Chess.White)(Chess.newBoard), true);
});

test('Game.play returns errors as data and undo restores board, turn and outcome', () => {
  const game = new Chess.Game();
  const initial = game.recent;
  assert.equal(game.play(6, 4)(4, 4), null);
  const first = game.recent;
  assert.equal(first[6][4], null);
  assert.deepEqual(first[4][4], [Chess.White, Chess.Pawn]);
  assert.equal(initial[6][4]?.[1], Chess.Pawn, 'earlier boards are immutable');
  assert.equal(game.turn, Chess.Black);
  assert.equal(game.previousTurn, Chess.White);
  assert.equal(game.play(1, 4)(3, 4), null);
  assert.equal(game.previousTurn, Chess.Black);
  assert.equal(game.play(9, 0)(0, 0), Chess.InvalidLocation);
  assert.equal(game.play(6, 0)(3, 0), Chess.NoMove);
  assert.equal(game.ply, 2, 'rejected moves do not add history');
  game.undo();
  assert.equal(game.recent, first);
  assert.equal(game.turn, Chess.Black);
  game.undo();
  game.undo();
  assert.equal(game.recent, initial);
  assert.equal(game.previousTurn, null);
  assert.equal(game.lastOutcome, Chess.NextPlayer);
  assert.throws(() => (game.recent as Chess.MaybeColorPiece[][])[0][0] = null, TypeError);
});

test('Scala Main example accepts the two opening knight moves and rejects its blocked bishop', () => {
  const game = new Chess.Game();
  assert.equal(game.play(7, 6)(5, 5), null);
  assert.equal(game.play(0, 6)(2, 5), null);
  assert.equal(game.play(0, 2)(5, 0), Chess.NoPlayerTurn);
  assert.equal(game.play(7, 7)(7, 6), null);
  assert.equal(game.play(0, 7)(0, 2), Chess.AlreadyOccupied);
});

test('movement helpers preserve immutable result boards and reject illegal geometry', () => {
  const board = boardWith(['e1', Chess.White, Chess.King], ['e8', Chess.Black, Chess.King], ['d4', Chess.White, Chess.Queen]);
  assert.equal(Chess.movePieceVariable(4, 3)(2, 4)(Chess.White, Chess.Queen)(board).ok, false);
  assert.equal(Chess.movePieceFixed(4, 3)(2, 4)(Chess.White, Chess.Knight)(board).ok, true);
  assert.equal(Chess.makeMove(3, 3)(2, 3)(Chess.White)(board).ok, false);
  assert.equal(Chess.movePiece(7, 4)(7, 4)(Chess.White, Chess.King)(board).ok, false);
});

test('pawns cannot jump into an occupied destination and promote on straight moves and captures', () => {
  const blocked = boardWith(['e1', Chess.White, Chess.King], ['e8', Chess.Black, Chess.King],
    ['a2', Chess.White, Chess.Pawn], ['a4', Chess.Black, Chess.Knight]);
  assert.deepEqual(Chess.movePawn(6, 0)(4, 0)(Chess.White)(blocked), { ok: false, error: Chess.MoveBlocked });
  for (const target of ['a8', 'b8']) {
    const game = new Chess.Game(boardWith(['e1', Chess.White, Chess.King], ['h8', Chess.Black, Chess.King],
      ['a7', Chess.White, Chess.Pawn], ['b8', Chess.Black, Chess.Rook]));
    assert.equal(play(game, 'a7', target), null);
    const square = squareCoordinates(target)!;
    assert.equal(game.recent[square[0]][square[1]]?.[1], Chess.Queen);
  }
});

test('threat helpers include knights, pawns, sliding pieces and adjacent kings', () => {
  const knight = boardWith(['e1', Chess.White, Chess.King], ['h8', Chess.Black, Chess.King], ['f3', Chess.Black, Chess.Knight]);
  assert.equal(Chess.isKnightCheckAt(7, 4)(Chess.White)(knight), true);
  const pawn = boardWith(['e1', Chess.White, Chess.King], ['h8', Chess.Black, Chess.King], ['d2', Chess.Black, Chess.Pawn]);
  assert.equal(Chess.isPawnCheckAt(7, 4)(Chess.White)(pawn), true);
  const rook = boardWith(['e1', Chess.White, Chess.King], ['h8', Chess.Black, Chess.King], ['e7', Chess.Black, Chess.Rook]);
  assert.equal(Chess.isVariableRangeCheckAt(7, 4)(Chess.White)(rook), true);
  const kings = boardWith(['e1', Chess.White, Chess.King], ['e2', Chess.Black, Chess.King]);
  assert.equal(Chess.isCheckAt(7, 4)(Chess.White)(kings), true);
});

test('a pinned piece cannot expose its king; capture of the checker is a legal escape', () => {
  const game = new Chess.Game(boardWith(['e1', Chess.White, Chess.King], ['a8', Chess.Black, Chess.King],
    ['e8', Chess.Black, Chess.Rook], ['e2', Chess.White, Chess.Rook]));
  assert.equal(play(game, 'e2', 'd2'), Chess.KingInCheck);
  const checked = new Chess.Game(boardWith(['e1', Chess.White, Chess.King], ['a1', Chess.Black, Chess.Rook], ['h8', Chess.Black, Chess.King]));
  assert.equal(checked.lastOutcome, Chess.Check, 'the king can escape the rook check');
  const interpose = new Chess.Game(boardWith(['a1', Chess.White, Chess.King], ['h8', Chess.Black, Chess.King],
    ['a8', Chess.Black, Chess.Rook], ['b8', Chess.Black, Chess.Rook], ['c2', Chess.White, Chess.Bishop]));
  assert.equal(interpose.lastOutcome, Chess.Check);
  assert.equal(play(interpose, 'c2', 'a4'), null, 'bishop can block the checking rook');
  const capture = new Chess.Game(boardWith(['e1', Chess.White, Chess.King], ['h8', Chess.Black, Chess.King],
    ['e2', Chess.Black, Chess.Rook], ['d1', Chess.White, Chess.Bishop]));
  assert.equal(capture.lastOutcome, Chess.Check);
  assert.equal(play(capture, 'd1', 'e2'), null, 'bishop can capture the checking rook');
});

test('castling moves both pieces, cannot cross check, and undo restores rights', () => {
  const game = Chess.Game.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const before = game.fen;
  assert.equal(play(game, 'e1', 'g1'), null);
  assert.deepEqual(game.recent[7][6], [Chess.White, Chess.King]);
  assert.deepEqual(game.recent[7][5], [Chess.White, Chess.Rook]);
  game.undo();
  assert.equal(game.fen, before);
  assert.equal(play(game, 'e1', 'c1'), null);
  assert.deepEqual(game.recent[7][3], [Chess.White, Chess.Rook]);
  const attacked = Chess.Game.fromFEN('r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1');
  assert.notEqual(play(attacked, 'e1', 'g1'), null, 'cannot castle through attacked f1');
  const moved = Chess.Game.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1');
  assert.notEqual(play(moved, 'e1', 'g1'), null, 'piece placement alone does not restore castling rights');
});

test('en passant removes the captured pawn and expires after another move', () => {
  const game = Chess.Game.fromFEN('4k3/5p2/8/4P3/8/8/8/4K3 b - - 0 1');
  assert.equal(play(game, 'f7', 'f5'), null);
  const before = game.fen;
  assert.equal(play(game, 'e5', 'f6'), null);
  assert.equal(game.recent[3][5], null);
  assert.deepEqual(game.recent[2][5], [Chess.White, Chess.Pawn]);
  game.undo();
  assert.equal(game.fen, before);
  assert.equal(play(game, 'e1', 'd1'), null);
  assert.equal(play(game, 'e8', 'd8'), null);
  assert.notEqual(play(game, 'e5', 'f6'), null);
});

test('promotion supports queen, rook, bishop and knight without changing the curried API', () => {
  for (const promotion of ['q', 'r', 'b', 'n'] as const) {
    const game = Chess.Game.fromFEN('7k/P7/8/8/8/8/8/4K3 w - - 0 1');
    assert.equal(game.play(1, 0)(0, 0, promotion), null);
    assert.equal(game.recent[0][0]?.[1].code, promotion.toUpperCase());
    game.undo();
    assert.equal(game.recent[1][0]?.[1], Chess.Pawn);
  }
});

test('repetition, fifty-move and insufficient-material draws are detected', () => {
  const repetition = new Chess.Game();
  for (let repeat = 0; repeat < 2; repeat += 1) {
    for (const move of [['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']]) {
      assert.equal(play(repetition, move[0], move[1]), null);
    }
  }
  assert.equal(repetition.lastOutcome, Chess.Draw);
  assert.equal(repetition.drawReason, 'repetition');
  repetition.undo();
  assert.equal(repetition.lastOutcome, Chess.NextPlayer);
  const fifty = Chess.Game.fromFEN('7k/8/8/8/8/8/8/R3K3 w - - 99 1');
  assert.equal(play(fifty, 'a1', 'a2'), null);
  assert.equal(fifty.lastOutcome, Chess.Draw);
  assert.equal(fifty.drawReason, 'fifty-move');
  const material = Chess.Game.fromFEN('7k/8/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(material.lastOutcome, Chess.Draw);
  assert.equal(material.drawReason, 'insufficient-material');
});

test('Fool’s mate reports the opponent checkmate; undo restores play', () => {
  const game = new Chess.Game();
  for (const move of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) assert.equal(play(game, move[0], move[1]), null);
  assert.equal(game.lastOutcome, Chess.CheckMate);
  assert.equal(game.turn, Chess.White);
  assert.equal(play(game, 'e2', 'e4'), Chess.GameOver);
  game.undo();
  assert.equal(game.turn, Chess.Black);
  assert.equal(game.lastOutcome, Chess.NextPlayer);
});

test('stalemate and algebraic adapters use the same rank/file layout', () => {
  const game = new Chess.Game(boardWith(['h8', Chess.Black, Chess.King], ['f7', Chess.White, Chess.King], ['g6', Chess.White, Chess.Queen]), Chess.Black);
  assert.equal(game.lastOutcome, Chess.Stalemate);
  assert.equal(squareName([0, 0]), 'a8');
  assert.deepEqual(squareCoordinates('e2'), [6, 4]);
  assert.equal(squareCoordinates('z0'), null);
  assert.equal(boardCharacters(Chess.newBoard)[7][4], 'K');
});

function pairedSessions() {
  const identities = [SessionIdentity.generate(), SessionIdentity.generate()];
  const queues: ChessMessage[][] = [[], []];
  const sessions = ([0, 1] as const).map((seat) => new ChessSession({
    seat, identity: identities[seat], peerKey: new PeerKey(identities[1 - seat].publicKeyHex),
    send: (message) => { queues[1 - seat].push(structuredClone(message)); return true; },
  }));
  const flush = () => {
    for (let count = 0; queues.some((queue) => queue.length); count += 1) {
      assert.ok(count < 20, 'handshake converges');
      for (const seat of [0, 1]) {
        for (const message of queues[seat].splice(0)) sessions[seat].receive(message);
      }
    }
  };
  sessions[0].connect();
  flush();
  assert.equal(sessions[1].phase, 'Idle', 'remote ready waits for local connection');
  sessions[1].connect();
  flush();
  assert.ok(sessions.every((session) => session.phase === 'Playing'));
  return { sessions, identities, queues, flush };
}

function resignStep() {
  const pair = pairedSessions();
  assert.equal(pair.sessions[0].submitResign(), true);
  pair.flush();
  return pair;
}

test('signed peers apply alternating moves and agree on checkmate and chain tip', () => {
  const pair = pairedSessions();
  const moves = [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']];
  moves.forEach((move, index) => {
    assert.equal(pair.sessions[index % 2].submitMove({ from: move[0], to: move[1] }), true);
    pair.flush();
    assert.equal(pair.sessions[0].view().position, pair.sessions[1].view().position);
  });
  assert.deepEqual(pair.sessions[0].lastResult, { winner: 1, reason: 'checkmate' });
  assert.deepEqual(pair.sessions[0].view().history, pair.sessions[1].view().history);
  assert.ok(pair.sessions[1].view().history.every((entry) => entry.verified));
});

test('duplicate moves are ignored, tampered signatures fail without applying a move', () => {
  const pair = pairedSessions();
  pair.sessions[0].submitMove({ from: 'e2', to: 'e4' });
  const message = pair.queues[1][0];
  pair.flush();
  pair.sessions[1].receive(message);
  assert.equal(pair.sessions[1].game.ply, 1);
  const before = pair.sessions[1].view().position;
  pair.sessions[1].receive({ kind: 'chess', packet: { ...message.packet, body: message.packet.body.replace('chess-step', 'bad-step') } });
  assert.equal(pair.sessions[1].phase, 'Failed');
  assert.equal(pair.sessions[1].view().position, before);
});

test('signed but out-of-order, illegal and out-of-turn actions are rejected', () => {
  for (const defect of ['position', 'sequence', 'illegal']) {
    const pair = pairedSessions();
    const sender = 0;
    pair.sessions[0].submitMove({ from: 'e2', to: 'e4' });
    const original = pair.queues[1][0];
    const value = JSON.parse(original.packet.body);
    if (defect === 'position') value.position = 'wrong position';
    if (defect === 'sequence') value.sequence = 99;
    if (defect === 'illegal') value.action.move = { from: [6, 4], to: [3, 4] };
    const body = JSON.stringify(value);
    const receiver = pair.sessions[1 - sender];
    const position = receiver.view().position;
    receiver.receive({ kind: 'chess', packet: { body, signature: pair.identities[sender].sign(body) } });
    assert.equal(receiver.phase, 'Failed', defect);
    assert.equal(receiver.view().position, position, defect);
  }
});

test('a validly signed wrong-turn move is rejected after passing state checks', () => {
  const pair = pairedSessions();
  pair.sessions[0].submitMove({ from: 'e2', to: 'e4' });
  const original = pair.queues[1][0];
  pair.sessions[0].game.undo();
  const value = JSON.parse(original.packet.body);
  value.by = 1;
  value.action.move = { from: [1, 4], to: [3, 4] };
  const body = JSON.stringify(value);
  const receiver = new ChessSession({ seat: 0, identity: pair.identities[0], peerKey: new PeerKey(pair.identities[1].publicKeyHex), send: () => true });
  receiver.connect();
  const readyBody = JSON.stringify({ kind: 'chess-ready', version: 1, match: 1, by: 1 });
  receiver.receive({ kind: 'chess', packet: { body: readyBody, signature: pair.identities[1].sign(readyBody) } });
  receiver.receive({ kind: 'chess', packet: { body, signature: pair.identities[1].sign(body) } });
  assert.equal(receiver.error, 'Invalid move or wrong player turn');
  assert.equal(receiver.game.ply, 0);
});

test('one-sided reconnect reaches the same fresh game on both peers', () => {
  const pair = pairedSessions();
  pair.sessions[0].disconnect();
  pair.sessions[0].connect();
  pair.flush();
  assert.ok(pair.sessions.every((session) => session.matchNo === 2 && session.phase === 'Playing'));
});

test('a failed transport send rolls back the local move', () => {
  const pair = pairedSessions();
  let reject = false;
  const player = new ChessSession({ seat: 0, identity: pair.identities[0], peerKey: new PeerKey(pair.identities[1].publicKeyHex), send: () => !reject });
  player.connect();
  const body = JSON.stringify({ kind: 'chess-ready', version: 1, match: 1, by: 1 });
  player.receive({ kind: 'chess', packet: { body, signature: pair.identities[1].sign(body) } });
  const before = player.game.fen;
  reject = true;
  assert.equal(player.submitMove({ from: 'e2', to: 'e4' }), false);
  assert.equal(player.game.fen, before);
  assert.equal(player.game.ply, 0);
  assert.equal(player.moves.length, 0);
  reject = false;
  assert.equal(player.submitMove({ from: 'e2', to: 'e4' }), true);
});

test('resignation works outside the player turn; rematch requires both players', () => {
  const pair = resignStep();
  assert.deepEqual(pair.sessions[0].lastResult, { winner: 1, reason: 'resignation' });
  pair.sessions[0].requestRematch();
  pair.flush();
  assert.equal(pair.sessions[1].matchNo, 1);
  assert.equal(pair.sessions[1].view().peerWantsRematch, true);
  pair.sessions[1].requestRematch();
  pair.flush();
  assert.ok(pair.sessions.every((session) => session.matchNo === 2 && session.game.ply === 0 && session.phase === 'Playing'));
});

test('disconnection pauses actions and reconnection starts a fresh agreed match', () => {
  const pair = pairedSessions();
  pair.sessions[0].disconnect();
  pair.sessions[1].disconnect();
  assert.equal(pair.sessions[0].submitMove({ from: 'e2', to: 'e4' }), false);
  pair.sessions[0].connect();
  pair.flush();
  pair.sessions[1].connect();
  pair.flush();
  assert.ok(pair.sessions.every((session) => session.matchNo === 2 && session.phase === 'Playing'));
  pair.sessions.forEach((session) => session.close());
});
