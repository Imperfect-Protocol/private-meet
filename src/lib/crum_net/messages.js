import { make_public_key_from_compressed_slice, PUBLIC_KEY_COMPRESSED_LEN } from "../crum_bls/util.js";
import { PokerHandProxy, PokerTable } from "../crum_pkr/index.js";
import {
  deserialize_masked_cards,
  deserialize_unmasked_card_sets,
  deserialize_unmasked_cards,
  serialize_masked_cards,
  serialize_unmasked_card_sets,
  serialize_unmasked_cards,
} from "./poker_deck_serialization.js";

export class PeerAnnouncement {
  constructor({ peer_id, player_index, table_id, annonce_public_key }) {
    this.peer_id = peer_id;
    this.player_index = player_index;
    this.table_id = table_id;
    this.annonce_public_key = annonce_public_key;
  }
}

export class EndpointDescriptor {
  constructor({ public_ip, public_port, transport_hint }) {
    this.public_ip = public_ip;
    this.public_port = public_port;
    this.transport_hint = transport_hint;
  }
}

export class HandshakeSignal {
  constructor({ table_id, hand_id, from, to, topology, encrypted_endpoint, nonce }) {
    this.table_id = table_id;
    this.hand_id = hand_id;
    this.from = from;
    this.to = to;
    this.topology = topology;
    this.encrypted_endpoint = encrypted_endpoint;
    this.nonce = nonce;
  }
}

export class PokerActionEnvelope {
  constructor({ table_id, hand_id, from, sequence, sequence_number = null, expected_state, action, result = null }) {
    this.table_id = table_id;
    this.hand_id = hand_id;
    this.from = from;
    this.sequence = sequence;
    this.sequence_number = sequence_number;
    this.expected_state = expected_state;
    this.action = action;
    this.result = result;
  }

  to_wire(log_lines) {
    const action = poker_action_to_wire(this.action);
    return new PokerActionEnvelopeWire({
      table_id: this.table_id,
      hand_id: this.hand_id,
      from: this.from,
      sequence: this.sequence,
      sequence_number: this.sequence_number,
      expected_state: this.expected_state,
      submit: poker_action_wire_to_submit(action),
      log_lines,
    });
  }
}

export class PokerActionEnvelopeWire {
  constructor({
    table_id,
    hand_id,
    from,
    sequence,
    sequence_number = null,
    expected_state,
    action,
    submit = null,
    nop = null,
    log_lines,
  }) {
    this.table_id = table_id;
    this.hand_id = hand_id;
    this.from = from;
    this.sequence = sequence;
    this.sequence_number = sequence_number;
    this.expected_state = expected_state;
    this.nop = nop;
    this.action = nop ? null : action ?? poker_submit_to_action_wire(submit);
    this.submit = nop ? null : submit ?? poker_action_wire_to_submit(this.action);
    this.log_lines = log_lines;
  }

  to_envelope() {
    if (this.nop) {
      throw new Error("NOP wire messages do not have PokerHand submit envelopes");
    }
    return new PokerActionEnvelope({
      table_id: this.table_id,
      hand_id: this.hand_id,
      from: this.from,
      sequence: this.sequence,
      sequence_number: this.sequence_number,
      expected_state: this.expected_state,
      action: poker_action_wire_to_action(this.action),
    });
  }
}

export const P2pMessage = Object.freeze({
  Handshake: (signal) => ({ type: "Handshake", signal }),
  PokerAction: (envelope) => ({ type: "PokerAction", envelope }),
  Ack: ({ from, sequence }) => ({ type: "Ack", from, sequence }),
  StateDigest: ({ from, hand_id, digest }) => ({ type: "StateDigest", from, hand_id, digest }),
});

export const PokerAction = Object.freeze({
  SubmitShuffledDeck: ({ player, deck }) => ({ type: "SubmitShuffledDeck", player, deck }),
  SubmitSmallBlind: ({ player }) => ({ type: "SubmitSmallBlind", player }),
  SubmitBigBlind: ({ player }) => ({ type: "SubmitBigBlind", player }),
  SubmitPlayerCards: ({ player, cards }) => ({ type: "SubmitPlayerCards", player, cards }),
  SubmitCommunityCards: ({ player, round, cards }) => ({
    type: "SubmitCommunityCards",
    player,
    round,
    cards,
  }),
  SubmitShowdownCards: ({ player, cards }) => ({ type: "SubmitShowdownCards", player, cards }),
  SubmitBet: ({ player, amount }) => ({ type: "SubmitBet", player, amount }),
  SubmitPublicKey: ({ player, public_key, traces }) => ({
    type: "SubmitPublicKey",
    player,
    public_key,
    traces,
  }),
});

export function poker_action_to_wire(action) {
  switch (action.type) {
    case "SubmitShuffledDeck":
      return {
        type: "SubmitShuffledDeck",
        player: action.player,
        deck_g1_compressed: serialize_masked_cards(action.deck),
      };
    case "SubmitSmallBlind":
      return { type: "SubmitSmallBlind", player: action.player };
    case "SubmitBigBlind":
      return { type: "SubmitBigBlind", player: action.player };
    case "SubmitPlayerCards":
      return {
        type: "SubmitPlayerCards",
        player: action.player,
        player_cards_g1_compressed: serialize_unmasked_card_sets(action.cards),
      };
    case "SubmitCommunityCards":
      return {
        type: "SubmitCommunityCards",
        player: action.player,
        round: action.round,
        cards_g1_compressed: serialize_unmasked_cards(action.cards),
      };
    case "SubmitShowdownCards":
      return {
        type: "SubmitShowdownCards",
        player: action.player,
        player_cards_g1_compressed: serialize_unmasked_card_sets(action.cards),
      };
    case "SubmitBet":
      return { type: "SubmitBet", player: action.player, amount: action.amount };
    case "SubmitPublicKey":
      return {
        type: "SubmitPublicKey",
        player: action.player,
        public_key_g2_compressed: action.public_key.toRawBytes(true),
        traces: action.traces.map((trace) => [trace.after_index, trace.claimed_before_index]),
      };
    default:
      throw new Error(`unknown PokerAction: ${action.type}`);
  }
}

export function poker_action_wire_to_submit(action) {
  switch (action.type) {
    case "SubmitShuffledDeck":
      return {
        method: "submit_shuffled_deck",
        args: [action.player, action.deck_g1_compressed],
      };
    case "SubmitSmallBlind":
      return { method: "submit_small_blind", args: [action.player] };
    case "SubmitBigBlind":
      return { method: "submit_big_blind", args: [action.player] };
    case "SubmitPlayerCards":
      return {
        method: "submit_player_cards",
        args: [action.player, action.player_cards_g1_compressed],
      };
    case "SubmitCommunityCards":
      return {
        method: "submit_community_cards",
        args: [action.player, action.round, action.cards_g1_compressed],
      };
    case "SubmitShowdownCards":
      return {
        method: "submit_player_cards_showdown",
        args: [action.player, action.player_cards_g1_compressed],
      };
    case "SubmitPublicKey":
      return {
        method: "submit_public_key",
        args: [action.player, action.public_key_g2_compressed, action.traces],
      };
    case "SubmitBet":
      return {
        method: "submit_bet",
        args: [action.player, action.amount],
      };
    default:
      throw new Error(`unknown PokerActionWire: ${action.type}`);
  }
}

export function poker_submit_to_action_wire(submit) {
  if (!submit?.method) {
    throw new Error("submit method is required");
  }
  const data = submit.data ?? {};
  const args = submit.args ?? data.args ?? [];
  switch (submit.method) {
    case "submit_shuffled_deck":
      return {
        type: "SubmitShuffledDeck",
        player: args[0] ?? data.player,
        deck_g1_compressed: args[1] ?? data.deck_g1_compressed,
      };
    case "submit_small_blind":
      return { type: "SubmitSmallBlind", player: args[0] ?? data.player };
    case "submit_big_blind":
      return { type: "SubmitBigBlind", player: args[0] ?? data.player };
    case "submit_player_cards":
      return {
        type: "SubmitPlayerCards",
        player: args[0] ?? data.player,
        player_cards_g1_compressed: args[1] ?? data.player_cards_g1_compressed,
      };
    case "submit_community_cards":
      return {
        type: "SubmitCommunityCards",
        player: args[0] ?? data.player,
        round: args[1] ?? data.round,
        cards_g1_compressed: args[2] ?? data.cards_g1_compressed,
      };
    case "submit_player_cards_showdown":
      return {
        type: "SubmitShowdownCards",
        player: args[0] ?? data.player,
        player_cards_g1_compressed: args[1] ?? data.player_cards_g1_compressed,
      };
    case "submit_public_key":
      return {
        type: "SubmitPublicKey",
        player: args[0] ?? data.player,
        public_key_g2_compressed: args[1] ?? data.public_key_g2_compressed,
        traces: args[2] ?? data.traces,
      };
    case "submit_bet":
      return {
        type: "SubmitBet",
        player: args[0] ?? data.player,
        amount: args[1] ?? data.amount,
      };
    default:
      throw new Error(`unknown PokerHand submit method: ${submit.method}`);
  }
}

export function poker_action_wire_to_action(action) {
  switch (action.type) {
    case "SubmitShuffledDeck":
      return PokerAction.SubmitShuffledDeck({
        player: action.player,
        deck: deserialize_masked_cards(action.deck_g1_compressed),
      });
    case "SubmitSmallBlind":
      return PokerAction.SubmitSmallBlind({ player: action.player });
    case "SubmitBigBlind":
      return PokerAction.SubmitBigBlind({ player: action.player });
    case "SubmitPlayerCards":
      return PokerAction.SubmitPlayerCards({
        player: action.player,
        cards: deserialize_unmasked_card_sets(action.player_cards_g1_compressed),
      });
    case "SubmitCommunityCards":
      return PokerAction.SubmitCommunityCards({
        player: action.player,
        round: action.round,
        cards: deserialize_unmasked_cards(action.cards_g1_compressed),
      });
    case "SubmitShowdownCards":
      return PokerAction.SubmitShowdownCards({
        player: action.player,
        cards: deserialize_unmasked_card_sets(action.player_cards_g1_compressed),
      });
    case "SubmitBet":
      return PokerAction.SubmitBet({ player: action.player, amount: action.amount });
    case "SubmitPublicKey": {
      if (action.public_key_g2_compressed.length !== PUBLIC_KEY_COMPRESSED_LEN) {
        throw new Error(
          `invalid compressed G2 public-key length: expected ${PUBLIC_KEY_COMPRESSED_LEN}, received ${action.public_key_g2_compressed.length}`
        );
      }
      return PokerAction.SubmitPublicKey({
        player: action.player,
        public_key: make_public_key_from_compressed_slice(action.public_key_g2_compressed),
        traces: action.traces.map(([after_index, claimed_before_index]) => ({
          after_index,
          claimed_before_index,
        })),
      });
    }
    default:
      throw new Error(`unknown PokerActionWire: ${action.type}`);
  }
}

export class PokerClientState {
  constructor(player_index, table_id, hand_id, table) {
    this.player_index = player_index;
    this.table_id = table_id;
    this.hand_id = hand_id;
    this.sequence = 0;
    this.seen = new Set();
    this.table = table;
  }

  static new(player_index, table_id, hand_id, table) {
    return new PokerClientState(player_index, table_id, hand_id, table);
  }

  submit_local_action(action) {
    const expected_state = this.current_state_tuple();
    const result = this.apply_action(clone_action(action));

    this.sequence += 1;
    this.seen.add(seenKey(this.player_index, this.sequence));
    this.table.sequence_number += 1;
    return new PokerActionEnvelope({
      table_id: this.table_id,
      hand_id: this.hand_id,
      from: this.player_index,
      sequence: this.sequence,
      sequence_number: this.table.sequence_number,
      expected_state,
      action,
      result,
    });
  }

  submit_nop({ current_player, reason = "your turn not mine" } = {}) {
    const expected_state = this.current_state_tuple();

    return new PokerActionEnvelopeWire({
      table_id: this.table_id,
      hand_id: this.hand_id,
      from: this.player_index,
      sequence: this.sequence,
      sequence_number: this.table.sequence_number,
      expected_state,
      nop: {
        player: this.player_index,
        current_player,
        reason,
      },
      log_lines: [],
    });
  }

  apply_envelope(envelope) {
    return this.apply_envelope_result(envelope).applied;
  }

  apply_envelope_result(envelope) {
    if (envelope.table_id !== this.table_id || envelope.hand_id !== this.hand_id) {
      return { applied: false, result: null };
    }

    const key = seenKey(envelope.from, envelope.sequence);
    if (this.seen.has(key)) {
      return { applied: false, result: null };
    }

    const current_state = this.current_state_tuple();
    if (!tupleEquals(current_state, envelope.expected_state)) {
      return {
        applied: false,
        result: null,
        mismatch: {
          local: current_state,
          remote_expected: envelope.expected_state,
        },
      };
    }

    this.seen.add(key);
    if (envelope.from === this.player_index) {
      this.sequence = Math.max(
        Number(this.sequence ?? 0),
        Number(envelope.sequence ?? 0),
      );
    }
    const result = this.apply_action(envelope.action);
    this.table.sequence_number = Math.max(
      Number(this.table.sequence_number ?? 0),
      Number(envelope.sequence_number ?? 0),
    );
    this.table.clear_events?.();
    return { applied: true, result };
  }

  apply_nop_wire(wire) {
    if (wire.table_id !== this.table_id || wire.hand_id !== this.hand_id) {
      return false;
    }
    return true;
  }

  current_hand() {
    return this.table.get_current_hand();
  }

  current_hand_mut() {
    const hand = this.table.get_current_hand_mut();
    if (hand == null) {
      throw new Error("hand not started");
    }
    return hand;
  }

  current_state_tuple() {
    const hand = this.table.get_current_hand();
    if (hand == null) {
      throw new Error("hand not started");
    }
    return hand.get_current_state().to_tuple();
  }

  apply_action(action) {
    const hand = this.current_hand_mut();
    const proxy = new PokerHandProxy(hand);
    switch (action.type) {
      case "SubmitShuffledDeck":
        return proxy.submit_shuffled_deck(action.player, action.deck, { publish: false });
      case "SubmitSmallBlind":
        return proxy.submit_small_blind(action.player, { publish: false });
      case "SubmitBigBlind":
        return proxy.submit_big_blind(action.player, { publish: false });
      case "SubmitPlayerCards":
        return proxy.submit_player_cards(action.player, action.cards, { publish: false });
      case "SubmitCommunityCards":
        return proxy.submit_community_cards(action.player, action.round, action.cards, { publish: false });
      case "SubmitShowdownCards":
        return proxy.submit_player_cards_showdown(action.player, action.cards, { publish: false });
      case "SubmitBet":
        return proxy.submit_bet(action.player, action.amount, { publish: false });
      case "SubmitPublicKey":
        return proxy.submit_public_key(action.player, action.public_key, action.traces, { publish: false });
      default:
        throw new Error(`unknown PokerAction: ${action.type}`);
    }
  }
}

export const PokerGameClientState = PokerClientState;

function clone_action(action) {
  return {
    ...action,
    deck: action.deck?.clone?.() ?? action.deck,
    cards: Array.isArray(action.cards)
      ? action.cards.map((cards) => cards?.clone?.() ?? cards)
      : action.cards?.clone?.() ?? action.cards,
    traces: action.traces?.map((trace) => ({ ...trace })) ?? action.traces,
  };
}

function seenKey(player, sequence) {
  return `${player}:${sequence}`;
}

function tupleEquals(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export { PokerTable };
