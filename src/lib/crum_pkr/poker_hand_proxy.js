export const POKER_HAND_SUBMIT_METHODS = Object.freeze([
  "submit_shuffled_deck",
  "submit_small_blind",
  "submit_big_blind",
  "submit_player_cards",
  "submit_player_cards_showdown",
  "submit_community_cards",
  "submit_public_key",
  "submit_bet",
]);

export class PokerHandProxy {
  constructor(hand, { on_submit = null } = {}) {
    this.hand = hand;
    this.on_submit = on_submit;
  }

  submit_shuffled_deck(player, deck, options = {}) {
    return this.submit("submit_shuffled_deck", [player, deck], options);
  }

  submit_small_blind(player, options = {}) {
    return this.submit("submit_small_blind", [player], options);
  }

  submit_big_blind(player, options = {}) {
    return this.submit("submit_big_blind", [player], options);
  }

  submit_player_cards(player, player_cards, options = {}) {
    return this.submit("submit_player_cards", [player, player_cards], options);
  }

  submit_player_cards_showdown(player, player_cards, options = {}) {
    return this.submit("submit_player_cards_showdown", [player, player_cards], options);
  }

  submit_community_cards(player, round, cards, options = {}) {
    return this.submit("submit_community_cards", [player, round, cards], options);
  }

  submit_public_key(player, public_key, traces, options = {}) {
    return this.submit("submit_public_key", [player, public_key, traces], options);
  }

  submit_bet(player, amount, options = {}) {
    return this.submit("submit_bet", [player, amount], options);
  }

  apply_submit(submit, options = {}) {
    const args = submit?.args ?? submit?.data?.args;
    if (!submit?.method || !Array.isArray(args)) {
      throw new Error("PokerHandProxy submit messages require { method, args }");
    }
    return this.submit(submit.method, args, options);
  }

  submit(method, args, { publish = true } = {}) {
    if (!POKER_HAND_SUBMIT_METHODS.includes(method)) {
      throw new Error(`unknown PokerHand submit method: ${method}`);
    }

    this.hand.clear_events?.();
    const status = this.hand[method](...args);
    const events = this.hand.drain_events?.() ?? [];
    const result = { status, events };

    if (publish) {
      this.on_submit?.({ method, args }, result);
    }

    return result;
  }
}
