import {
  PokerAction,
  PokerClientState,
  poker_action_to_wire,
  poker_action_wire_to_action,
} from '../crum_net/index.js';
import { POKER_HOLDEM_ROUNDS, PokerTable } from '../crum_pkr/index.js';
import { bestHoldemScore, holdemRank } from '../crum_pkr/hand_evaluator.js';
import { SessionIdentity } from './SessionIdentity.js';

export const STARTING_STACK = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = SMALL_BLIND * 2;
const HAND_RESULT_PAUSE_MS = 4000;
const SEATS = 2;

/** Lifecycle of a heads-up match. Initial: Idle. Final: Closed. Error: Failed. */
export const MatchPhase = Object.freeze({
  Idle: 'Idle',
  AwaitingPeer: 'AwaitingPeer',
  HandRunning: 'HandRunning',
  HandResult: 'HandResult',
  MatchOver: 'MatchOver',
  Failed: 'Failed',
  Closed: 'Closed',
});

const MESSAGE = Object.freeze({ Ready: 'ready', Action: 'action', Decline: 'decline' });

function randomUnit() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 0x100000000;
}

function compareScores(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Outcome of one finished hand, computed identically by both peers. */
export class HandResult {
  constructor(hand, viewerSeat, signingKey) {
    const display = hand.to_display_data(viewerSeat, signingKey);
    const active = hand.betting_state.active_players;
    this.pot = hand.betting_state.pot;
    this.community = display.community_cards;
    this.cards = Array.from({ length: SEATS }, (_unused, seat) => display.player_cards_by_seat[seat] ?? []);
    this.folded = active.filter(Boolean).length === 1;
    this.ranks = Array.from({ length: SEATS }, (_unused, seat) => (
      this.folded ? null : holdemRank([...this.cards[seat], ...this.community])
    ));
    this.winners = this.folded ? [active.indexOf(true)] : HandResult.showdownWinners(this.cards, this.community, active);
    const share = Math.floor(this.pot / this.winners.length);
    this.payouts = Array(SEATS).fill(0);
    this.winners.forEach((seat) => { this.payouts[seat] += share; });
    this.payouts[this.winners[0]] += this.pot - share * this.winners.length;
    this.stacks = hand.betting_state.player_chips.map((chips, seat) => chips + this.payouts[seat]);
  }

  static showdownWinners(cards, community, active) {
    const scores = cards.map((hole, seat) => (active[seat] ? bestHoldemScore([...hole, ...community]) : null));
    const best = scores.reduce((top, score) => (score && (!top || compareScores(score, top) > 0) ? score : top), null);
    return scores.flatMap((score, seat) => (score && compareScores(score, best) === 0 ? [seat] : []));
  }
}

/**
 * Heads-up Texas Hold'em between two peers over an ordered, authenticated message pipe.
 * Each peer owns a full PokerTable replica; protocol steps (shuffle, blinds, unmasking, key reveal)
 * run automatically on the acting peer, bets come from the UI. Matches always start at 1000 chips.
 */
export class HeadsUpMatch {
  constructor({ seat, identity, send, onChange = () => {}, log = () => {}, timer = globalThis, pauseMs = HAND_RESULT_PAUSE_MS }) {
    this.seat = seat;
    this.identity = identity;
    this.send = send;
    this.onChange = onChange;
    this.log = log;
    this.timer = timer;
    this.pauseMs = pauseMs;
    this.phase = MatchPhase.Idle;
    this.matchNo = 0;
    this.handNo = 0;
    this.stacks = [STARTING_STACK, STARTING_STACK];
    this.client = null;
    this.shuffleTrace = null;
    this.inbox = [];
    this.lastResult = null;
    this.localReady = 0;
    this.remoteReady = 0;
    this.peerDeclined = false;
    this.error = null;
    this.stepScheduled = false;
    this.pauseTimer = null;
  }

  /** Link is up: agree on a fresh match with the peer. */
  connect() {
    this.requestMatch(Math.max(this.matchNo + 1, this.remoteReady));
  }

  /** Link is down: abandon the current hand, keep the table open. */
  disconnect() {
    if (this.phase === MatchPhase.Closed) return;
    this.timer.clearTimeout(this.pauseTimer);
    this.client = null;
    this.inbox = [];
    this.transition(MatchPhase.AwaitingPeer);
  }

  /** "Play again?" answer after a player runs out of chips. */
  vote(playAgain) {
    if (this.phase !== MatchPhase.MatchOver) return;
    if (playAgain) {
      this.requestMatch(this.matchNo + 1);
      return;
    }
    this.localReady = this.matchNo;
    this.send({ kind: MESSAGE.Decline, match: this.matchNo });
    this.onChange();
  }

  /** Chips added this action: 0 = check/fold, toCall = call, more = raise, all chips = all-in. */
  bet(amount) {
    const options = this.betOptions();
    if (!options) return false;
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > options.chips) return false;
    if (amount > 0 && amount < options.toCall && amount !== options.chips) return false;
    this.submit(PokerAction.SubmitBet({ player: this.seat, amount }));
    return true;
  }

  betOptions() {
    const hand = this.currentHand();
    const state = hand?.get_current_state().to_enum();
    if (this.phase !== MatchPhase.HandRunning || state?.type !== 'Bet' || state.player !== this.seat) return null;
    const chips = hand.get_chips_remaining(this.seat);
    const toCall = Math.min(hand.get_call_amount_required(this.seat), chips);
    return { chips, toCall, minRaise: Math.min(chips, toCall + BIG_BLIND), maxRaise: chips };
  }

  receive(message) {
    if (this.phase === MatchPhase.Closed) return;
    if (message.kind === MESSAGE.Ready) {
      this.remoteReady = Math.max(this.remoteReady, Number(message.match) || 0);
      this.reconcileReady();
      this.onChange();
      return;
    }
    if (message.kind === MESSAGE.Decline) {
      this.peerDeclined = Number(message.match) === this.matchNo;
      this.onChange();
      return;
    }
    if (message.kind === MESSAGE.Action) {
      this.inbox.push(message);
      this.drainInbox();
    }
  }

  close() {
    this.timer.clearTimeout(this.pauseTimer);
    this.client = null;
    this.transition(MatchPhase.Closed);
  }

  currentHand() {
    return this.client?.current_hand() ?? null;
  }

  requestMatch(matchNo) {
    this.localReady = matchNo;
    if (this.phase !== MatchPhase.MatchOver) this.transition(MatchPhase.AwaitingPeer);
    this.send({ kind: MESSAGE.Ready, match: matchNo });
    this.reconcileReady();
    this.onChange();
  }

  reconcileReady() {
    if (this.phase === MatchPhase.MatchOver) {
      if (this.localReady > this.matchNo && this.remoteReady === this.localReady) this.startMatch(this.localReady);
      return;
    }
    if (this.phase !== MatchPhase.AwaitingPeer || this.localReady === 0) return;
    if (this.remoteReady > this.localReady) {
      this.requestMatch(this.remoteReady);
      return;
    }
    if (this.remoteReady === this.localReady) this.startMatch(this.localReady);
  }

  startMatch(matchNo) {
    this.matchNo = matchNo;
    this.handNo = 0;
    this.stacks = [STARTING_STACK, STARTING_STACK];
    this.lastResult = null;
    this.peerDeclined = false;
    this.error = null;
    this.inbox = this.inbox.filter((message) => message.match >= matchNo);
    this.log(`Match ${matchNo} started: ${STARTING_STACK} chips each, blinds ${SMALL_BLIND}/${BIG_BLIND}`);
    this.startHand();
  }

  startHand() {
    this.handNo += 1;
    // A hand's masking key is revealed for verification. Never reuse it for the next hand.
    this.handIdentity = SessionIdentity.generate();
    const dealer = (this.handNo - 1) % SEATS;
    const table = PokerTable.new(SEATS, POKER_HOLDEM_ROUNDS);
    table.join(0);
    table.join(1);
    table.start_hand([...this.stacks], SMALL_BLIND, dealer);
    this.client = PokerClientState.new(this.seat, 'private-meet', `${this.matchNo}.${this.handNo}`, table);
    this.shuffleTrace = null;
    this.log(`Hand ${this.handNo}: dealer is seat ${dealer + 1}`);
    this.transition(MatchPhase.HandRunning);
    this.drainInbox();
    this.scheduleStep();
  }

  transition(phase) {
    this.phase = phase;
    this.onChange();
  }

  fail(reason) {
    this.error = reason;
    this.log(`Error: ${reason}`);
    this.timer.clearTimeout(this.pauseTimer);
    this.transition(MatchPhase.Failed);
  }

  isCurrent(message) {
    return message.match === this.matchNo && message.hand === this.handNo;
  }

  drainInbox() {
    if (this.phase !== MatchPhase.HandRunning) return;
    this.inbox = this.inbox.filter((message) => message.match > this.matchNo
      || (message.match === this.matchNo && message.hand >= this.handNo));
    while (this.phase === MatchPhase.HandRunning) {
      const index = this.inbox.findIndex((message) => this.isCurrent(message));
      if (index === -1) return;
      const [message] = this.inbox.splice(index, 1);
      this.applyRemote(message);
    }
  }

  applyRemote(message) {
    try {
      const envelope = { ...message.envelope, action: poker_action_wire_to_action(message.envelope.action) };
      const outcome = this.client.apply_envelope_result(envelope);
      if (!outcome.applied) {
        if (outcome.mismatch) this.fail(`Peer state mismatch (local ${outcome.mismatch.local}, remote ${outcome.mismatch.remote_expected})`);
        return;
      }
      this.log(`Seat ${envelope.from + 1}: ${envelope.action.type}${envelope.action.type === 'SubmitBet' ? ` ${envelope.action.amount}` : ''}`);
      this.afterAction();
    } catch (error) {
      this.fail(`Peer action rejected: ${error.message}`);
    }
  }

  submit(action) {
    try {
      const envelope = this.client.submit_local_action(action);
      this.send({
        kind: MESSAGE.Action,
        match: this.matchNo,
        hand: this.handNo,
        envelope: {
          table_id: envelope.table_id,
          hand_id: envelope.hand_id,
          from: envelope.from,
          sequence: envelope.sequence,
          sequence_number: envelope.sequence_number,
          expected_state: envelope.expected_state,
          action: poker_action_to_wire(action),
        },
      });
      this.log(`Me: ${action.type}${action.type === 'SubmitBet' ? ` ${action.amount}` : ''}`);
      this.afterAction();
    } catch (error) {
      this.fail(`Local action failed: ${error.message}`);
    }
  }

  afterAction() {
    const state = this.currentHand().get_current_state().to_enum();
    if (state.type === 'Finished') {
      this.finishHand();
      return;
    }
    if (state.type === 'Cheated') {
      this.fail('Cheating detected: shuffle or unmasking proof failed');
      return;
    }
    this.onChange();
    this.scheduleStep();
  }

  scheduleStep() {
    if (this.stepScheduled) return;
    this.stepScheduled = true;
    this.timer.setTimeout(() => {
      this.stepScheduled = false;
      this.step();
    }, 0);
  }

  /** Runs this peer's automatic protocol step, if it is this peer's turn. */
  step() {
    if (this.phase !== MatchPhase.HandRunning) return;
    const action = this.automaticAction();
    if (action) this.submit(action);
  }

  automaticAction() {
    const hand = this.currentHand();
    const state = hand.get_current_state().to_enum();
    if (state.player !== this.seat) return null;
    const player = this.seat;
    const signingKey = this.handIdentity.signingKey;

    switch (state.type) {
      case 'Shuffle': {
        const deck = state.is_dealer ? hand.get_poker_deck().masked_cards() : hand.get_shuffled_deck().clone();
        deck.mask(signingKey);
        this.shuffleTrace = deck.shuffle_traced(randomUnit);
        return PokerAction.SubmitShuffledDeck({ player, deck });
      }
      case 'SmallBlind':
        return PokerAction.SubmitSmallBlind({ player });
      case 'BigBlind':
        return PokerAction.SubmitBigBlind({ player });
      case 'UnmaskHoleCards': {
        const cards = hand.get_player_cards().map((cardSet) => cardSet.clone());
        cards.forEach((cardSet, seat) => { if (seat !== player) cardSet.unmask(signingKey); });
        return PokerAction.SubmitPlayerCards({ player, cards });
      }
      case 'UnmaskCommunityCards': {
        const cards = hand.get_community_cards(state.round).clone();
        cards.unmask(signingKey);
        return PokerAction.SubmitCommunityCards({ player, round: state.round, cards });
      }
      case 'UnmaskShowdown': {
        const cards = hand.get_player_cards().map((cardSet) => cardSet.clone());
        cards[player].unmask(signingKey);
        return PokerAction.SubmitShowdownCards({ player, cards });
      }
      case 'SubmitPublicKey':
        return PokerAction.SubmitPublicKey({ player, public_key: this.handIdentity.publicKey, traces: this.shuffleTrace });
      default:
        return null;
    }
  }

  finishHand() {
    const result = new HandResult(this.currentHand(), this.seat, this.handIdentity.signingKey);
    this.lastResult = result;
    this.stacks = result.stacks;
    this.log(`Hand ${this.handNo} won by seat ${result.winners.map((seat) => seat + 1).join(' & ')} (pot ${result.pot})`);
    if (this.stacks.some((chips) => chips === 0)) {
      this.transition(MatchPhase.MatchOver);
      this.reconcileReady();
      return;
    }
    this.transition(MatchPhase.HandResult);
    this.pauseTimer = this.timer.setTimeout(() => {
      if (this.phase === MatchPhase.HandResult) this.startHand();
    }, this.pauseMs);
  }

  /** Plain view model for the table UI. */
  view() {
    const hand = this.currentHand();
    const display = hand?.to_display_data(this.seat, this.handIdentity.signingKey) ?? null;
    const state = hand?.get_current_state().to_enum() ?? null;
    const live = this.phase === MatchPhase.HandRunning && display;
    return {
      phase: this.phase,
      matchNo: this.matchNo,
      handNo: this.handNo,
      seat: this.seat,
      dealer: display?.dealer_seat_number ?? null,
      stacks: live ? display.player_chips : this.stacks,
      bets: live ? display.current_round_bets.map((bet) => bet ?? 0) : [0, 0],
      pot: live ? Number(display.current_pot) : 0,
      community: live ? display.community_cards : (this.lastResult?.community ?? []),
      myCards: display?.own_player_cards ?? [],
      folded: live ? display.active_players.map((active) => !active) : [false, false],
      turn: live && state && 'player' in state ? state.player : null,
      stateLabel: live ? display.state_label : '',
      betOptions: this.betOptions(),
      lastResult: this.lastResult,
      peerWantsRematch: this.phase === MatchPhase.MatchOver && this.remoteReady > this.matchNo,
      iWantRematch: this.phase === MatchPhase.MatchOver && this.localReady > this.matchNo,
      peerDeclined: this.peerDeclined,
      error: this.error,
    };
  }
}
