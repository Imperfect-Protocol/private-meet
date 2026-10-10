import { bls, Fp12, G2 } from './curves.js';
import { hash_to_curve } from './hash_to_curve.js';
import { digest_to_g1 } from './sign.js';

function pairingProductIsIdentity(pairs) {
  let product = Fp12.ONE;
  for (const [g1, g2] of pairs) {
    product = Fp12.mul(product, bls.pairing(g1, g2));
  }
  return Fp12.eql(product, Fp12.ONE);
}

export function verify(message, pk, sig) {
  const h = hash_to_curve(message);
  return pairingProductIsIdentity([
    [sig, G2.BASE],
    [h, pk.negate()],
  ]);
}

export function verify_digest(digest, pk, sig) {
  const h = digest_to_g1(digest);
  return pairingProductIsIdentity([
    [sig, G2.BASE],
    [h, pk.negate()],
  ]);
}

export function verify_unmasking(masked, unmasked, pk) {
  return pairingProductIsIdentity([
    [unmasked, pk],
    [masked, G2.BASE.negate()],
  ]);
}

export function verify_shuffle(masked_before, masked_after, pk) {
  if (masked_before.length < masked_after.length) {
    throw new Error('Masked before must at least same length as masked after');
  }

  const availableBefore = Array.from(masked_before);
  for (const pointAfter of masked_after) {
    let matchedIndex = -1;
    for (let i = 0; i < availableBefore.length; i += 1) {
      if (pairingProductIsIdentity([
        [pointAfter, G2.BASE.negate()],
        [availableBefore[i], pk],
      ])) {
        matchedIndex = i;
        break;
      }
    }
    if (matchedIndex === -1) {
      throw new Error('Cryptographic forgery detected');
    }
    availableBefore.splice(matchedIndex, 1);
  }
}

export class ShuffleTrace {
  constructor(after_index, claimed_before_index) {
    this.after_index = after_index;
    this.claimed_before_index = claimed_before_index;
  }
}

export function verify_shuffle_traced(masked_before, masked_after, pk, traces) {
  const usedBeforeIndices = new Set();
  const pairs = [];

  for (const trace of traces) {
    const afterIndex = trace.after_index;
    const claimedBeforeIndex = trace.claimed_before_index;
    if (afterIndex >= masked_after.length || claimedBeforeIndex >= masked_before.length) {
      throw new Error('Trace index out of bounds');
    }
    if (usedBeforeIndices.has(claimedBeforeIndex)) {
      throw new Error('Duplicate input index! Cheater attempted to clone a card.');
    }
    usedBeforeIndices.add(claimedBeforeIndex);
    pairs.push([masked_after[afterIndex], G2.BASE.negate()]);
    pairs.push([masked_before[claimedBeforeIndex], pk]);
  }

  if (!pairingProductIsIdentity(pairs)) {
    throw new Error('Cryptographic forgery: The batched trace verification failed.');
  }
}
