export const POKER_TABLE_EVENT = Object.freeze({
  HAND_STARTED: "hand_started",
  DECK_SHUFFLED: "deck_shuffled",
  ROUND_STARTED: "round_started",
  SMALL_BLIND_POSTED: "small_blind_posted",
  BIG_BLIND_POSTED: "big_blind_posted",
  BET: "bet",
  FOLD: "fold",
  HAND_ENDED: "hand_ended",
  HAND_RESULT: "hand_result",
});

export const POKER_TABLE_ROUND = Object.freeze({
  BLINDS: 0,
  PRE_FLOP: 1,
  FLOP: 2,
  TURN: 3,
  RIVER: 4,
});

export class PokerEventSource {
  constructor() {
    this.event_listeners = new Set();
    this.pending_events = [];
  }

  on_event(listener) {
    this.event_listeners.add(listener);
    return () => this.event_listeners.delete(listener);
  }

  emit_event(event) {
    const normalized = { ...event };
    this.pending_events.push(normalized);
    this.event_listeners.forEach((listener) => listener(normalized));
    return normalized;
  }

  drain_events() {
    const events = this.pending_events;
    this.pending_events = [];
    return events;
  }

  clear_events() {
    this.pending_events = [];
  }
}
