import { G1 } from "../crum_bls/curves.js";
import { toBytes } from "../crum_bls/bytes.js";
import { MaskedCards, UnmaskedCards } from "../crum_pkr/index.js";

export const G1AFFINE_COMPRESSED_LEN = 48;

export class PokerDeckSerializationError extends Error {
  constructor(kind, fields = {}) {
    const message = formatError(kind, fields);
    super(message);
    this.name = "PokerDeckSerializationError";
    this.kind = kind;
    Object.assign(this, fields);
  }
}

export function serialize_g1_affine(point) {
  return point.toRawBytes(true);
}

export function deserialize_g1_affine(bytes) {
  const data = toBytes(bytes);
  if (data.length !== G1AFFINE_COMPRESSED_LEN) {
    throw new PokerDeckSerializationError("InvalidG1CompressedLength", {
      expected: G1AFFINE_COMPRESSED_LEN,
      actual: data.length,
    });
  }

  try {
    const point = G1.fromHex(data);
    point.assertValidity();
    return point;
  } catch {
    throw new PokerDeckSerializationError("G1DecodeError");
  }
}

export function serialize_masked_cards(cards) {
  return serialize_g1_cards(cards.cards());
}

export function deserialize_masked_cards(cards) {
  return MaskedCards.new(deserialize_g1_cards(cards));
}

export function serialize_masked_card_sets(card_sets) {
  return card_sets.map(serialize_masked_cards);
}

export function deserialize_masked_card_sets(card_sets) {
  return card_sets.map(deserialize_masked_cards);
}

export function serialize_unmasked_cards(cards) {
  return serialize_g1_cards(cards.cards());
}

export function deserialize_unmasked_cards(cards) {
  return UnmaskedCards.new(deserialize_g1_cards(cards));
}

export function serialize_unmasked_card_sets(card_sets) {
  return card_sets.map(serialize_unmasked_cards);
}

export function deserialize_unmasked_card_sets(card_sets) {
  return card_sets.map(deserialize_unmasked_cards);
}

export function serialize_unmasking_sequence(sequence) {
  return sequence.map((stage) => serialize_unmasked_card_sets(stage));
}

export function deserialize_unmasking_sequence(sequence) {
  return sequence.map((stage) => deserialize_unmasked_card_sets(stage));
}

function serialize_g1_cards(cards) {
  return cards.map(serialize_g1_affine);
}

function deserialize_g1_cards(cards) {
  return cards.map(deserialize_g1_affine);
}

function formatError(kind, fields) {
  switch (kind) {
    case "InvalidG1CompressedLength":
      return `invalid compressed G1 length: expected ${fields.expected}, received ${fields.actual}`;
    case "G1DecodeError":
      return "could not decode compressed G1 point";
    default:
      return kind;
  }
}
