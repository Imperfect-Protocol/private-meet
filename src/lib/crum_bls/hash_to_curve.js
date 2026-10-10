import { bls, RUST_HASH_TO_CURVE_DST, rustKeccakXmdHash } from './curves.js';
import { toBytes } from './bytes.js';

export function hash_to_curve(message) {
  return bls.G1.hashToCurve(toBytes(message), {
    DST: RUST_HASH_TO_CURVE_DST,
    hash: rustKeccakXmdHash,
  });
}
