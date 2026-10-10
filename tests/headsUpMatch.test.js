import assert from 'node:assert/strict';
import test from 'node:test';
import { HeadsUpMatch, MatchPhase, STARTING_STACK } from '../src/lib/meet/HeadsUpMatch.js';
import { SessionIdentity, PeerKey } from '../src/lib/meet/SessionIdentity.js';
import { WireCodec } from '../src/lib/meet/WireCodec.js';

/** Two matches wired through an ordered async pipe that round-trips the wire codec. */
function createTable({ policy }) {
  const timer = { setTimeout: (fn) => setImmediate(fn), clearTimeout: () => {} };
  const players = [];
  const deliver = (to, message) => {
    const wire = WireCodec.decode(WireCodec.encode(message));
    setImmediate(() => players[to].receive(wire));
  };
  for (const seat of [0, 1]) {
    players.push(new HeadsUpMatch({
      seat,
      identity: SessionIdentity.generate(),
      send: (message) => deliver(1 - seat, message),
      onChange: () => setImmediate(() => policy(players[seat])),
      timer,
      pauseMs: 0,
    }));
  }
  return players;
}

function waitFor(predicate, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error('timed out'));
      setTimeout(poll, 5);
    };
    poll();
  });
}

test('a ready message arriving before the local connection does not deadlock', () => {
  const players = createTable({ policy: () => {} });
  players[0].receive({ kind: 'ready', match: 1 });
  players[0].connect();
  assert.equal(players[0].matchNo, 1);
  assert.equal(players[0].phase, MatchPhase.HandRunning);
  players.forEach((player) => player.close());
});

test('session identity signs and verifies', () => {
  const identity = SessionIdentity.generate();
  const key = new PeerKey(identity.publicKeyHex);
  const signature = identity.sign('hello');
  assert.equal(key.verifies('hello', signature), true);
  assert.equal(key.verifies('hellO', signature), false);
});

test('two peers play a full checked-down hand with matching state', async () => {
  const handsSeen = [];
  const players = createTable({
    policy: (player) => {
      const options = player.betOptions();
      if (options) player.bet(options.toCall);
    },
  });
  players[0].onChange = ((original) => () => {
    original();
    if (players[0].phase === MatchPhase.HandResult) handsSeen.push(players[0].lastResult);
  })(players[0].onChange);

  players.forEach((player) => player.connect());
  await waitFor(() => handsSeen.length >= 1);

  const result = handsSeen[0];
  assert.equal(result.community.length, 5);
  assert.ok(result.community.every(Boolean), 'all community cards revealed');
  assert.deepEqual(players[0].lastResult.stacks, players[1].lastResult.stacks);
  assert.equal(result.stacks[0] + result.stacks[1], STARTING_STACK * 2);
  players.forEach((player) => player.close());
});

test('all-in ends the match and both players can play again from 1000 chips', async () => {
  let votes = 0;
  const players = createTable({
    policy: (player) => {
      if (player.phase === MatchPhase.MatchOver && !player.view().iWantRematch && votes < 2) {
        votes += 1;
        player.vote(true);
        return;
      }
      const options = player.betOptions();
      if (options) player.bet(options.chips);
    },
  });

  players.forEach((player) => player.connect());
  await waitFor(() => players.every((player) => player.matchNo === 2 && player.phase === MatchPhase.HandRunning));

  assert.equal(votes, 2);
  assert.deepEqual(players[0].stacks, [STARTING_STACK, STARTING_STACK]);
  assert.deepEqual(players[1].stacks, [STARTING_STACK, STARTING_STACK]);
  players.forEach((player) => player.close());
});

test('a folded hand pays the pot to the bettor', async () => {
  const players = createTable({
    policy: (player) => {
      const options = player.betOptions();
      if (!options) return;
      player.bet(options.toCall > 0 ? 0 : 50);
    },
  });

  players.forEach((player) => player.connect());
  await waitFor(() => players.every((player) => player.lastResult));

  const result = players[0].lastResult;
  assert.equal(result.folded, true);
  assert.equal(result.stacks[result.winners[0]], STARTING_STACK + 20, 'bettor wins the big blind');
  assert.equal(result.stacks[0] + result.stacks[1], STARTING_STACK * 2);
  assert.deepEqual(players[1].lastResult.stacks, result.stacks);
  players.forEach((player) => player.close());
});
