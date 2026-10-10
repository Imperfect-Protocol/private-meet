import { POKER_HOLDEM_ROUNDS } from "./poker_state.js";

const HIDDEN_CARD = "\u{1F0A0}";

const CARD_CODEPOINTS = Object.freeze({
  s: Object.freeze({
    A: 0x1F0A1,
    2: 0x1F0A2,
    3: 0x1F0A3,
    4: 0x1F0A4,
    5: 0x1F0A5,
    6: 0x1F0A6,
    7: 0x1F0A7,
    8: 0x1F0A8,
    9: 0x1F0A9,
    T: 0x1F0AA,
    J: 0x1F0AB,
    Q: 0x1F0AD,
    K: 0x1F0AE,
  }),
  h: Object.freeze({
    A: 0x1F0B1,
    2: 0x1F0B2,
    3: 0x1F0B3,
    4: 0x1F0B4,
    5: 0x1F0B5,
    6: 0x1F0B6,
    7: 0x1F0B7,
    8: 0x1F0B8,
    9: 0x1F0B9,
    T: 0x1F0BA,
    J: 0x1F0BB,
    Q: 0x1F0BD,
    K: 0x1F0BE,
  }),
  d: Object.freeze({
    A: 0x1F0C1,
    2: 0x1F0C2,
    3: 0x1F0C3,
    4: 0x1F0C4,
    5: 0x1F0C5,
    6: 0x1F0C6,
    7: 0x1F0C7,
    8: 0x1F0C8,
    9: 0x1F0C9,
    T: 0x1F0CA,
    J: 0x1F0CB,
    Q: 0x1F0CD,
    K: 0x1F0CE,
  }),
  c: Object.freeze({
    A: 0x1F0D1,
    2: 0x1F0D2,
    3: 0x1F0D3,
    4: 0x1F0D4,
    5: 0x1F0D5,
    6: 0x1F0D6,
    7: 0x1F0D7,
    8: 0x1F0D8,
    9: 0x1F0D9,
    T: 0x1F0DA,
    J: 0x1F0DB,
    Q: 0x1F0DD,
    K: 0x1F0DE,
  }),
});

export function formatPokerCard(card) {
  if (card == null || card === "_!" || card === HIDDEN_CARD) return HIDDEN_CARD;

  const text = card.toString();
  if (text.length !== 2) return text;

  const [rank, suit] = text;
  const codepoint = CARD_CODEPOINTS[suit]?.[rank];
  return codepoint == null ? text : String.fromCodePoint(codepoint);
}

export function cardsToConsoleString(cards) {
  return cards.map(formatPokerCard).join(", ");
}

export function communityCardConsoleLines(hand) {
  const communityCards = [];
  const deck = hand.get_poker_deck();

  for (let round = 0; round < POKER_HOLDEM_ROUNDS; round += 1) {
    const cards = hand.get_community_cards(round);
    if (cards != null) {
      communityCards.push(...deck.unmasked_cards(cards));
    }
  }

  return [`Community cards: ${cardsToConsoleString(communityCards)}`];
}

export function playerCardConsoleLines(hand) {
  const deck = hand.get_poker_deck();
  return hand.get_player_cards().map((cards, index) => {
    const unmasked = deck.unmasked_cards(cards);
    return `Player ${index + 1} cards: ${cardsToConsoleString(unmasked)}`;
  });
}

export function playerOwnCardsConsoleString(player, hand, signingKey) {
  const deck = hand.get_poker_deck();
  const cards = hand.get_player_cards()[player]?.clone();
  if (!cards) return `${HIDDEN_CARD}, ${HIDDEN_CARD}`;

  try {
    if (signingKey) cards.unmask(signingKey);
    return cardsToConsoleString(deck.unmasked_cards(cards));
  } catch {
    return cardsToConsoleString(deck.unmasked_cards(cards));
  }
}

export function submitConsoleLine(submit) {
  const player = Number(submit?.args?.[0] ?? 0);
  const playerLabel = Number.isFinite(player) ? player + 1 : "?";
  const amount = submit?.args?.[1];
  const round = Number(submit?.args?.[1] ?? 0);

  switch (submit?.method) {
    case "submit_shuffled_deck":
      return `Shuffle on Player ${playerLabel}`;
    case "submit_small_blind":
      return `Small Blind on Player ${playerLabel}`;
    case "submit_big_blind":
      return `Big Blind on Player ${playerLabel}`;
    case "submit_player_cards":
      return `Unmask Hole Cards on Player ${playerLabel}`;
    case "submit_player_cards_showdown":
      return `Unmask Showdown on Player ${playerLabel}`;
    case "submit_community_cards":
      return `Round ${round + 1} Unmask Community Cards on Player ${playerLabel}`;
    case "submit_public_key":
      return `Submit Public Key on Player ${playerLabel}`;
    case "submit_bet":
      return `Player ${playerLabel} Bet: $${amount}`;
    default:
      return null;
  }
}
