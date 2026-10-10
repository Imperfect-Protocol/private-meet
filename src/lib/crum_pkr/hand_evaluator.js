const RANK_VALUE = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const HAND_RANK = [
  'HiCard',
  'Pair',
  'TwoPairs',
  'ThreeOfAKind',
  'Straight',
  'Flush',
  'FullHouse',
  'FourOfAKind',
  'StraightFlush',
];

function parseCard(card) {
  return {
    rank: card[0],
    suit: card[1],
    value: RANK_VALUE[card[0]],
    card,
  };
}

function combinations(cards, size) {
  const result = [];

  function visit(start, combo) {
    if (combo.length === size) {
      result.push(combo);
      return;
    }

    for (let index = start; index <= cards.length - (size - combo.length); index += 1) {
      visit(index + 1, [...combo, cards[index]]);
    }
  }

  visit(0, []);
  return result;
}

function compareScore(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function straightHigh(values) {
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  if (uniqueValues.includes(14)) uniqueValues.push(1);

  for (let index = 0; index <= uniqueValues.length - 5; index += 1) {
    const window = uniqueValues.slice(index, index + 5);
    if (window.every((value, offset) => value === window[0] - offset)) {
      return window[0] === 1 ? 5 : window[0];
    }
  }

  return null;
}

function scoreFiveCards(cards) {
  const parsed = cards.map(parseCard);
  const values = parsed.map((card) => card.value).sort((a, b) => b - a);
  const flush = parsed.every((card) => card.suit === parsed[0].suit);
  const straight = straightHigh(values);

  const groups = [...values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map()).entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || right.value - left.value);

  if (flush && straight) return [8, straight];

  if (groups[0].count === 4) {
    return [7, groups[0].value, groups.find((group) => group.count === 1).value];
  }

  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return [6, groups[0].value, groups[1].value];
  }

  if (flush) return [5, ...values];
  if (straight) return [4, straight];

  if (groups[0].count === 3) {
    return [
      3,
      groups[0].value,
      ...groups.filter((group) => group.count === 1).map((group) => group.value),
    ];
  }

  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pairs = groups.filter((group) => group.count === 2).map((group) => group.value);
    return [2, ...pairs, groups.find((group) => group.count === 1).value];
  }

  if (groups[0].count === 2) {
    return [
      1,
      groups[0].value,
      ...groups.filter((group) => group.count === 1).map((group) => group.value),
    ];
  }

  return [0, ...values];
}

export function bestHoldemScore(cards) {
  if (cards.length < 5) return null;

  return combinations(cards, 5).reduce((best, hand) => {
    const score = scoreFiveCards(hand);
    return !best || compareScore(score, best) > 0 ? score : best;
  }, null);
}

export function holdemRank(cards) {
  const score = bestHoldemScore(cards);
  if (!score) return null;
  return HAND_RANK[score[0]] ?? null;
}

export function holdemShowdown(hands, communityCards, activePlayers = []) {
  let bestScore = null;
  let winner = null;
  const rankedHands = hands.map((cards) => ({ cards, rank: null }));

  hands.forEach((hand, seat) => {
    if (activePlayers.length > 0 && activePlayers[seat] === false) return;
    if (!hand || hand.length !== 2 || communityCards.length < 5) return;

    const score = bestHoldemScore([...hand, ...communityCards]);
    if (!score) return;
    rankedHands[seat] = {
      cards: hand,
      rank: HAND_RANK[score[0]] ?? null,
    };

    const comparison = bestScore ? compareScore(score, bestScore) : 1;
    if (comparison > 0) {
      bestScore = score;
      winner = seat;
    }
  });

  return { hands: rankedHands, winner };
}

export function holdemWinners(hands, communityCards, activePlayers = []) {
  const { winner } = holdemShowdown(hands, communityCards, activePlayers);
  return winner == null ? [] : [winner];
}
