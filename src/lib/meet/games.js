/** Games a meeting can be played with. The guest picks one when booking; Poker is the default. */
export const GameKind = Object.freeze({ Poker: 'poker', Chess: 'chess' });

export const GAMES = Object.freeze([
  Object.freeze({ kind: GameKind.Poker, label: 'Poker', description: 'Heads-up Texas Hold’em, 1000 play chips each. No real money.' }),
  Object.freeze({ kind: GameKind.Chess, label: 'Chess', description: 'One game of chess, no clock. The host plays White.' }),
]);

/** Display name of a game. Meetings booked before games could be chosen are Poker. */
export function gameLabel(kind) {
  return (GAMES.find((game) => game.kind === kind) ?? GAMES[0]).label;
}
