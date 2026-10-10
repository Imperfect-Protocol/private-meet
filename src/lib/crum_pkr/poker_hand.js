import { PokerBettingState } from "./poker_bets.js";
import { PokerDeck, UnmaskedCards } from "./poker_deck.js";
import {
  POKER_TABLE_EVENT,
  POKER_TABLE_ROUND,
  PokerEventSource,
} from "./poker_events.js";
import {
  POKER_HAND_STATE_BET,
  POKER_HAND_STATE_BIG_BLIND,
  POKER_HAND_STATE_CHEATED,
  POKER_HAND_STATE_FINISHED,
  POKER_HAND_STATE_SMALL_BLIND,
  POKER_HAND_STATE_SUBMIT_PUBLIC_KEY,
  POKER_HAND_STATE_UNMASK_COMMUNITY_CARDS,
  POKER_HAND_STATE_UNMASK_HOLE_CARDS,
  POKER_HAND_STATE_UNMASK_SHOWDOWN,
  POKER_HOLDEM_PREFLOP,
  PokerHandState,
} from "./poker_state.js";
import { verifyShuffleTraced, verifyUnmaskingHistory } from "./crum_bls_bridge.js";

function cloneUnmaskedCardsList(cards) {
  return cards.map((card) => card.clone());
}

function cloneUnmaskingSequence(sequence) {
  return sequence.map(([player, state_type, submitted_cards]) => [
    player,
    state_type,
    cloneUnmaskedCardsList(submitted_cards),
  ]);
}

export class PokerHand extends PokerEventSource {
  constructor(num_players, max_rounds, dealer_button, initial_chips, small_blind) {
    super();
    const poker_deck = PokerDeck.new();
    const shuffled_deck = poker_deck.masked_cards();
    this.poker_deck = poker_deck;
    this.shuffled_deck = shuffled_deck;
    this.shuffle_history = [];
    this.player_cards = Array.from({ length: num_players }, () => UnmaskedCards.default());
    this.player_keys = Array.from({ length: num_players }, () => null);
    this.community_cards = Array.from({ length: max_rounds }, () => UnmaskedCards.default());
    this.unmasking_sequence = [];
    this.current_state = PokerHandState.new(num_players, max_rounds, dealer_button);
    this.betting_state = PokerBettingState.new(num_players, initial_chips);
    this.small_blind = small_blind;
  }

  static new(num_players, max_rounds, dealer_button, initial_chips, small_blind) {
    return new PokerHand(num_players, max_rounds, dealer_button, initial_chips, small_blind);
  }

  clone() {
    const hand = Object.create(PokerHand.prototype);
    hand.event_listeners = new Set();
    hand.pending_events = [];
    hand.poker_deck = this.poker_deck.clone();
    hand.shuffled_deck = this.shuffled_deck.clone();
    hand.shuffle_history = this.shuffle_history.map((deck) => deck.clone());
    hand.player_cards = cloneUnmaskedCardsList(this.player_cards);
    hand.player_keys = [...this.player_keys];
    hand.community_cards = cloneUnmaskedCardsList(this.community_cards);
    hand.unmasking_sequence = cloneUnmaskingSequence(this.unmasking_sequence);
    hand.current_state = this.current_state.clone();
    hand.betting_state = this.betting_state.clone();
    hand.small_blind = this.small_blind;
    return hand;
  }

  get_current_state() {
    return this.current_state;
  }

  get_poker_deck() {
    return this.poker_deck;
  }

  get_shuffled_deck() {
    return this.shuffled_deck;
  }

  get_player_cards() {
    return this.player_cards;
  }

  get_community_cards(round) {
    if (round === POKER_HOLDEM_PREFLOP) {
      return null;
    }
    return this.community_cards[round - 1] ?? null;
  }

  get_call_amount_required(player) {
    return this.betting_state.call_amount_required(player);
  }

  get_chips_remaining(player) {
    return this.betting_state.chips_remaining(player);
  }

  get_small_blind() {
    return this.small_blind;
  }

  get_big_blind() {
    return this.small_blind * 2;
  }

  to_display_data(acting_player = null, acting_signing_key = null) {
    const state = this.get_current_state();
    const state_enum = state.to_enum();
    const community_cards = [];
    for (let round = 0; round < state.max_rounds; round += 1) {
      const cards = this.get_community_cards(round);
      if (cards) {
        community_cards.push(...this.project_card_strings(cards));
      }
    }

    const player_cards_by_seat = {};
    this.player_cards.forEach((cards, player) => {
      player_cards_by_seat[player] = this.project_card_strings(cards);
    });
    const own_player_cards = acting_player == null
      ? []
      : this.project_private_card_strings(this.player_cards[acting_player], acting_signing_key);

    return {
      current_player: state.get_current_player().toString(),
      current_round: state.current_round,
      current_state: state.to_tuple().join(":"),
      state_type: state_enum.type,
      state_label: this.state_label(state_enum),
      dealer_seat_number: state.dealer_button,
      small_blind: this.get_small_blind(),
      big_blind: this.get_big_blind(),
      current_pot: this.betting_state.pot.toString(),
      min_bet: acting_player == null ? 0 : this.safe_call_amount_required(acting_player),
      max_bet: acting_player == null ? 0 : this.safe_chips_remaining(acting_player),
      bet_step: this.get_small_blind(),
      community_cards,
      own_player_cards,
      player_cards_by_seat,
      player_chips: [...this.betting_state.player_chips],
      current_round_bets: [...this.betting_state.current_round_bets],
      active_players: [...this.betting_state.active_players],
      allin_players: [...this.betting_state.allin_players],
    };
  }

  submit_shuffled_deck(player, deck) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "Shuffle") {
      throw new Error("Not in shuffle state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to shuffle");
    }

    this.shuffle_history.push(deck.clone());
    this.shuffled_deck = deck.clone();
    this.emit_event({
      type: POKER_TABLE_EVENT.DECK_SHUFFLED,
      seat_number: player,
    });

    if (this.current_state.next_player()) {
      this.current_state.current_state = POKER_HAND_STATE_SMALL_BLIND;
      this.emit_round_started(POKER_TABLE_ROUND.BLINDS);
    }
  }

  submit_small_blind(player) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "SmallBlind") {
      throw new Error("Not in small blind state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to post small blind");
    }

    const posted_small_blind = Math.min(this.get_small_blind(), this.get_chips_remaining(player));
    this.betting_state.process_action(player, posted_small_blind);
    this.emit_event({
      type: POKER_TABLE_EVENT.SMALL_BLIND_POSTED,
      seat_number: player,
      small_blind: posted_small_blind,
    });

    this.current_state.next_player();
    this.current_state.current_state = POKER_HAND_STATE_BIG_BLIND;
  }

  submit_big_blind(player) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "BigBlind") {
      throw new Error("Not in big blind state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to post big blind");
    }

    const posted_big_blind = Math.min(this.get_big_blind(), this.get_chips_remaining(player));
    this.betting_state.process_action(player, posted_big_blind);
    this.emit_event({
      type: POKER_TABLE_EVENT.BIG_BLIND_POSTED,
      seat_number: player,
      big_blind: posted_big_blind,
    });

    for (let i = 0; i < this.player_cards.length; i += 1) {
      this.player_cards[i] = this.shuffled_deck.deal(2);
    }

    this.current_state.next_dealer();
    this.current_state.current_state = POKER_HAND_STATE_UNMASK_HOLE_CARDS;
  }

  submit_player_cards(player, player_cards) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "UnmaskHoleCards") {
      throw new Error("Not in unmask hole cards state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to unmask hole cards");
    }

    if (player_cards.length !== this.player_cards.length) {
      throw new Error("Incorrect length of player cards");
    }

    this.unmasking_sequence.push([
      player,
      POKER_HAND_STATE_UNMASK_HOLE_CARDS,
      cloneUnmaskedCardsList(player_cards),
    ]);
    this.player_cards = cloneUnmaskedCardsList(player_cards);

    if (this.current_state.next_player()) {
      this.current_state.next_player_masked(this.betting_state.get_betting_players(), true);
      this.betting_state.next_street();
      this.current_state.current_state = POKER_HAND_STATE_BET;
      this.emit_round_started(POKER_TABLE_ROUND.PRE_FLOP);

      this.check_betting_round_complete();
      return true;
    }

    return false;
  }

  submit_player_cards_showdown(player, player_cards) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "UnmaskShowdown") {
      throw new Error("Not in unmask hole cards state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to unmask hole cards");
    }

    if (player_cards.length !== this.player_cards.length) {
      throw new Error("Incorrect length of player cards");
    }

    this.unmasking_sequence.push([
      player,
      POKER_HAND_STATE_UNMASK_SHOWDOWN,
      cloneUnmaskedCardsList(player_cards),
    ]);
    this.player_cards = cloneUnmaskedCardsList(player_cards);

    if (this.current_state.next_player()) {
      this.current_state.current_state = POKER_HAND_STATE_SUBMIT_PUBLIC_KEY;
      this.emit_event({
        type: POKER_TABLE_EVENT.HAND_ENDED,
        seat_number: this.current_state.get_current_player(),
      });
      return true;
    }

    return false;
  }

  submit_community_cards(player, round, cards) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "UnmaskCommunityCards") {
      throw new Error("Not in bet state");
    }

    if (state.round !== round) {
      throw new Error("Not this round to unmask cards");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to bet");
    }

    const round_cards = this.community_cards[round - 1];
    if (round_cards == null) {
      throw new Error("No round cards");
    }

    this.unmasking_sequence.push([
      player,
      POKER_HAND_STATE_UNMASK_COMMUNITY_CARDS,
      [cards.clone()],
    ]);
    this.community_cards[round - 1] = cards.clone();

    if (this.current_state.next_player()) {
      this.current_state.next_player_masked(this.betting_state.get_betting_players(), true);
      this.betting_state.next_street();
      this.current_state.current_state = POKER_HAND_STATE_BET;
      this.emit_round_started(round + 1);

      this.check_betting_round_complete();
      return true;
    }

    return false;
  }

  submit_public_key(player, pk, traces) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "SubmitPublicKey") {
      throw new Error("Not in submit public key state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to submit public key");
    }

    this.player_keys[player] = pk;

    if (!this.verify_shuffle(player, pk, traces)) {
      this.current_state.current_state = POKER_HAND_STATE_CHEATED;
      throw new Error("Player cheated during shuffle");
    }

    if (this.current_state.next_player()) {
      const cheater = this.verify_unmasking();
      if (cheater != null) {
        this.current_state.current_state = POKER_HAND_STATE_CHEATED;
        throw new Error(`Player cheated during unmasking ${cheater}`);
      }
      this.current_state.current_state = POKER_HAND_STATE_FINISHED;
      this.emit_event({
        type: POKER_TABLE_EVENT.HAND_RESULT,
        seat_number: this.result_seat_number(),
        pot_size: this.betting_state.pot,
      });
    }
  }

  verify_shuffle(player, pk, traces) {
    const num_players = this.current_state.num_players;
    const dealer = this.current_state.dealer_button;

    const step_index = (player + num_players - dealer) % num_players;

    const next_cards = this.shuffle_history[step_index].cards();
    const prev_cards =
      step_index === 0 ? this.poker_deck.cards() : this.shuffle_history[step_index - 1].cards();

    try {
      verifyShuffleTraced(prev_cards, next_cards, pk, traces);
      return true;
    } catch (err) {
      if (err?.code === "CRUM_BLS_UNAVAILABLE") {
        throw err;
      }
      return false;
    }
  }

  submit_bet(player, amount) {
    const state = this.get_current_state().to_enum();
    if (state.type !== "Bet") {
      throw new Error("Not in bet state");
    }

    if (state.player !== player) {
      throw new Error("Not your turn to bet");
    }

    const call_amount = this.betting_state.call_amount_required(player);
    this.betting_state.process_action(player, amount);
    this.emit_event({
      type: amount === 0 && call_amount > 0 ? POKER_TABLE_EVENT.FOLD : POKER_TABLE_EVENT.BET,
      seat_number: player,
      amount,
    });
    this.current_state.next_player_masked(this.betting_state.get_betting_players(), false);

    this.check_betting_round_complete();
  }

  verify_unmasking() {
    const final_shuffled_deck = this.shuffle_history.at(-1);
    if (final_shuffled_deck == null) {
      throw new Error("No shuffle history");
    }
    return verifyUnmaskingHistory(this);
  }

  check_betting_round_complete() {
    if (this.betting_state.is_betting_round_complete()) {
      this.betting_state.refund_uncalled_bets();
      this.current_state.next_dealer();
      const round = this.current_state.current_round;

      if (this.current_state.next_round()) {
        this.current_state.current_state = POKER_HAND_STATE_UNMASK_SHOWDOWN;
      } else {
        const num_cards_deal = round === POKER_HOLDEM_PREFLOP ? 3 : 1;
        this.community_cards[round] = this.shuffled_deck.deal(num_cards_deal);
        this.current_state.current_state = POKER_HAND_STATE_UNMASK_COMMUNITY_CARDS;
      }
    }
  }

  emit_round_started(round_number) {
    this.emit_event({
      type: POKER_TABLE_EVENT.ROUND_STARTED,
      seat_number: this.current_state.get_current_player(),
      round_number,
    });
  }

  result_seat_number() {
    const active_winner = this.betting_state.active_players.filter(Boolean).length === 1
      ? this.betting_state.active_players.findIndex(Boolean)
      : null;
    return active_winner ?? this.current_state.get_current_player();
  }

  safe_call_amount_required(player) {
    try {
      return this.get_call_amount_required(player);
    } catch {
      return 0;
    }
  }

  safe_chips_remaining(player) {
    try {
      return this.get_chips_remaining(player);
    } catch {
      return 0;
    }
  }

  safe_unmasked_card_strings(cards) {
    try {
      return this.poker_deck.unmasked_cards(cards).filter(Boolean).map((card) => card.toString());
    } catch {
      return [];
    }
  }

  project_card_strings(cards) {
    if (!cards) return [];
    try {
      return this.poker_deck.unmasked_cards(cards).map((card) => card?.toString() ?? null);
    } catch {
      return Array.from({ length: cards?.len?.() ?? 0 }, () => null);
    }
  }

  project_private_card_strings(cards, signing_key) {
    const public_projection = this.project_card_strings(cards);
    if (!signing_key || public_projection.every(Boolean)) {
      return public_projection;
    }

    try {
      const private_cards = cards.clone();
      private_cards.unmask(signing_key);
      const private_projection = this.project_card_strings(private_cards);
      return private_projection.some(Boolean) ? private_projection : public_projection;
    } catch {
      return public_projection;
    }
  }

  state_label(state) {
    switch (state.type) {
      case "Shuffle":
        return `Shuffle on Player ${state.player + 1}`;
      case "SmallBlind":
        return `Small Blind on Player ${state.player + 1}`;
      case "BigBlind":
        return `Big Blind on Player ${state.player + 1}`;
      case "Bet":
        return `Bet on Player ${state.player + 1}`;
      case "UnmaskHoleCards":
        return `Unmask Hole Cards on Player ${state.player + 1}`;
      case "UnmaskCommunityCards":
        return `Round ${state.round + 1} Unmask Community Cards on Player ${state.player + 1}`;
      case "UnmaskShowdown":
        return `Unmask Showdown on Player ${state.player + 1}`;
      case "SubmitPublicKey":
        return `Submit Public Key on Player ${state.player + 1}`;
      case "Finished":
        return "Hand ended";
      default:
        return state.type;
    }
  }
}
