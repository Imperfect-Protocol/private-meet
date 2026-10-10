import {
  clonePoint,
  compressedBytes,
  hashToCurve,
  invertSigningKey,
  keccak256,
  maskPoint,
  pointEquals,
} from "./crum_bls_bridge.js";

function bytesForCard(card) {
  return Uint8Array.from([card.charCodeAt(0), card.charCodeAt(1)]);
}

function cloneCards(cards) {
  return cards.map((card) => clonePoint(card));
}

function rngIndex(rng, upperExclusive) {
  if (typeof rng === "function") {
    return Math.floor(rng() * upperExclusive);
  }
  if (typeof rng?.random === "function") {
    return Math.floor(rng.random() * upperExclusive);
  }
  if (typeof rng?.next === "function") {
    return Math.floor(rng.next() * upperExclusive);
  }
  throw new Error("rng is required");
}

export class PokerCard {
  constructor(bytes = new Uint8Array()) {
    this.bytes = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  }

  clone() {
    return new PokerCard(this.bytes);
  }

  toString() {
    return String.fromCharCode(...this.bytes);
  }
}

export class PokerDeck {
  constructor(poker_cards = null, cards_g1 = null) {
    if (poker_cards == null && cards_g1 == null) {
      const cards = [];
      const points = [];
      for (const rank of "23456789TJQKA") {
        for (const suit of "shdc") {
          const card = `${rank}${suit}`;
          cards.push(new PokerCard(bytesForCard(card)));
          points.push(hashToCurve(bytesForCard(card)));
        }
      }
      this.poker_cards = cards;
      this.cards_g1 = points;
      return;
    }

    this.poker_cards = poker_cards.map((card) =>
      card instanceof PokerCard ? card.clone() : new PokerCard(card),
    );
    this.cards_g1 = cloneCards(cards_g1);
  }

  static new() {
    return new PokerDeck();
  }

  clone() {
    return new PokerDeck(this.poker_cards, this.cards_g1);
  }

  find_card(revealed_point) {
    const card_index = this.cards_g1.findIndex((point) => pointEquals(revealed_point, point));
    if (card_index === -1) {
      return null;
    }
    return this.poker_cards[card_index].clone();
  }

  cards() {
    return cloneCards(this.cards_g1);
  }

  len() {
    return this.cards_g1.length;
  }

  masked_cards() {
    return MaskedCards.new(this.cards());
  }

  unmasked_cards(unmasked_cards) {
    return unmasked_cards.cards_g1.map((card_g1) => this.find_card(card_g1));
  }
}

export class MaskedCards {
  constructor(cards_g1 = []) {
    this.cards_g1 = cloneCards(cards_g1);
  }

  static new(cards_g1) {
    return new MaskedCards(cards_g1);
  }

  static default() {
    return new MaskedCards();
  }

  clone() {
    return new MaskedCards(this.cards_g1);
  }

  cards() {
    return cloneCards(this.cards_g1);
  }

  cards_n(count) {
    return cloneCards(this.cards_g1.slice(0, count));
  }

  len() {
    return this.cards_g1.length;
  }

  mask(sk) {
    this.cards_g1 = this.cards_g1.map((card_g1) => maskPoint(card_g1, sk));
  }

  shuffle(rng) {
    for (let i = this.cards_g1.length - 1; i > 0; i -= 1) {
      const j = rngIndex(rng, i + 1);
      [this.cards_g1[i], this.cards_g1[j]] = [this.cards_g1[j], this.cards_g1[i]];
    }
  }

  shuffle_traced(rng) {
    const cards_g1_indexed = this.cards_g1.map((card, before_index) => ({
      before_index,
      card,
    }));

    for (let i = cards_g1_indexed.length - 1; i > 0; i -= 1) {
      const j = rngIndex(rng, i + 1);
      [cards_g1_indexed[i], cards_g1_indexed[j]] = [
        cards_g1_indexed[j],
        cards_g1_indexed[i],
      ];
    }

    const res = cards_g1_indexed.map(({ before_index }, after_index) => ({
      after_index,
      claimed_before_index: before_index,
    }));

    this.cards_g1 = cards_g1_indexed.map(({ card }) => card);
    return res;
  }

  hash() {
    const bytes = this.cards_g1.map((card) => compressedBytes(card));
    return keccak256(bytes);
  }

  deal(count) {
    const dealt_cards = this.cards_g1.splice(0, count);
    return UnmaskedCards.new(dealt_cards);
  }
}

export class UnmaskedCards {
  constructor(cards_g1 = []) {
    this.cards_g1 = cloneCards(cards_g1);
  }

  static new(cards_g1) {
    return new UnmaskedCards(cards_g1);
  }

  static default() {
    return new UnmaskedCards();
  }

  clone() {
    return new UnmaskedCards(this.cards_g1);
  }

  cards() {
    return cloneCards(this.cards_g1);
  }

  len() {
    return this.cards_g1.length;
  }

  unmask(sk) {
    const sk_inv = invertSigningKey(sk);
    this.cards_g1 = this.cards_g1.map((card_g1) => maskPoint(card_g1, sk_inv));
  }
}
