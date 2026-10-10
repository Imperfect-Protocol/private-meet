import { keccak_256 } from "@noble/hashes/sha3";
import { Fr } from "../crum_bls/curves.js";
import { concatBytes } from "../crum_bls/bytes.js";
import { hash_to_curve } from "../crum_bls/hash_to_curve.js";
import { mask } from "../crum_bls/sign.js";
import { verify_shuffle_traced, verify_unmasking } from "../crum_bls/verify.js";
import {
  POKER_HAND_STATE_CHEATED,
  POKER_HAND_STATE_UNMASK_COMMUNITY_CARDS,
  POKER_HAND_STATE_UNMASK_HOLE_CARDS,
  POKER_HAND_STATE_UNMASK_SHOWDOWN,
} from "./poker_state.js";

export function hashToCurve(bytes) {
  return hash_to_curve(bytes);
}

export function maskPoint(point, signingKey) {
  return mask(point, signingKey);
}

export function verifyShuffleTraced(maskedBefore, maskedAfter, publicKey, traces) {
  return verify_shuffle_traced(maskedBefore, maskedAfter, publicKey, traces);
}

export function keccak256(chunks) {
  return keccak_256(concatBytes(...chunks));
}

export function verifyUnmaskingHistory(hand) {
  const finalShuffledDeck = hand.shuffle_history.at(-1);
  if (finalShuffledDeck == null) {
    throw new Error("No shuffle history");
  }

  const finalShuffledDeckCards = finalShuffledDeck.cards();
  const numPlayers = hand.current_state.num_players;
  let deckIdx = 0;

  const trackedHoleCards = [];
  for (let i = 0; i < numPlayers; i += 1) {
    trackedHoleCards.push(finalShuffledDeckCards.slice(deckIdx, deckIdx + 2));
    deckIdx += 2;
  }

  const trackedCommunityCards = [
    finalShuffledDeckCards.slice(deckIdx, deckIdx + 3),
    finalShuffledDeckCards.slice(deckIdx + 3, deckIdx + 4),
    finalShuffledDeckCards.slice(deckIdx + 4, deckIdx + 5),
  ];

  let commRoundIdx = 0;
  let commUnmaskCount = 0;

  const preparedPks = [];
  for (const pk of hand.player_keys) {
    if (pk == null) {
      throw new Error("Missing PK for unmask audit");
    }
    preparedPks.push(pk);
  }

  const auditTrail = [];

  for (const [actionPlayer, stateType, submittedCards] of hand.unmasking_sequence) {
    switch (stateType) {
      case POKER_HAND_STATE_UNMASK_HOLE_CARDS: {
        for (let targetPlayer = 0; targetPlayer < numPlayers; targetPlayer += 1) {
          if (targetPlayer === actionPlayer) {
            continue;
          }
          const before = trackedHoleCards[targetPlayer];
          const after = submittedCards[targetPlayer].cards();
          for (let i = 0; i < before.length && i < after.length; i += 1) {
            auditTrail.push([after[i], before[i], actionPlayer]);
          }
          trackedHoleCards[targetPlayer] = after;
        }
        break;
      }
      case POKER_HAND_STATE_UNMASK_COMMUNITY_CARDS: {
        const before = trackedCommunityCards[commRoundIdx];
        const after = submittedCards[0].cards();
        for (let i = 0; i < before.length && i < after.length; i += 1) {
          auditTrail.push([after[i], before[i], actionPlayer]);
        }
        trackedCommunityCards[commRoundIdx] = after;
        commUnmaskCount += 1;
        if (commUnmaskCount === numPlayers) {
          commUnmaskCount = 0;
          commRoundIdx += 1;
        }
        break;
      }
      case POKER_HAND_STATE_UNMASK_SHOWDOWN: {
        const targetPlayer = actionPlayer;
        const before = trackedHoleCards[targetPlayer];
        const after = submittedCards[targetPlayer].cards();
        for (let i = 0; i < before.length && i < after.length; i += 1) {
          auditTrail.push([after[i], before[i], actionPlayer]);
        }
        trackedHoleCards[targetPlayer] = after;
        break;
      }
      default:
        break;
    }
  }

  let isValid = true;
  for (const [unmasked, masked, actionPlayer] of auditTrail) {
    if (!verify_unmasking(masked, unmasked, preparedPks[actionPlayer])) {
      isValid = false;
      break;
    }
  }

  if (isValid) {
    return null;
  }

  for (const [unmasked, masked, actionPlayer] of auditTrail) {
    if (!verify_unmasking(masked, unmasked, preparedPks[actionPlayer])) {
      hand.current_state.current_state = POKER_HAND_STATE_CHEATED;
      return actionPlayer;
    }
  }

  return null;
}

export function compressedBytes(point) {
  if (typeof point?.toRawBytes === "function") {
    return point.toRawBytes(true);
  }
  throw new TypeError("G1 point does not expose compressed bytes");
}

export function invertSigningKey(signingKey) {
  if (typeof signingKey === "bigint") {
    return Fr.inv(signingKey);
  }
  throw new TypeError("SigningKey must be a scalar bigint");
}

export function pointEquals(left, right) {
  if (left === right) {
    return true;
  }
  if (typeof left?.eq === "function") {
    return left.eq(right);
  }
  if (typeof left?.equals === "function") {
    return left.equals(right);
  }
  return false;
}

export function clonePoint(point) {
  return point;
}
