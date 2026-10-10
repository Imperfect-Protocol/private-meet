import { G1, G2, Fr } from './curves.js';
import { bytesToBigIntLE, bytesToHex, concatBytes, hexToBytes, toBytes } from './bytes.js';

export const SIGNING_KEY_LEN = 32;
export const SIGNATURE_COMPRESSED_LEN = 48;
export const PUBLIC_KEY_COMPRESSED_LEN = 96;

export function normalizeSigningKey(sk) {
  if (typeof sk === 'bigint') {
    const normalized = Fr.create(sk);
    if (normalized === 0n) throw new Error('Invalid zero signing key seed');
    return normalized;
  }
  return make_signing_key_from_seed(sk);
}

export function make_public_key_from_compressed_slice(data) {
  const bytes = toBytes(data);
  if (bytes.length !== PUBLIC_KEY_COMPRESSED_LEN) {
    throw new Error('Len Error');
  }
  try {
    const point = G2.fromHex(bytes);
    point.assertValidity();
    return point;
  } catch {
    throw new Error('Decode Error');
  }
}

export function make_signature_from_compressed_slice(data) {
  const bytes = toBytes(data);
  if (bytes.length !== SIGNATURE_COMPRESSED_LEN) {
    throw new Error('Len Error');
  }
  try {
    const point = G1.fromHex(bytes);
    point.assertValidity();
    return point;
  } catch {
    throw new Error('Decode Error');
  }
}

export function make_public_key_from_signing_key(sk) {
  return G2.BASE.multiply(normalizeSigningKey(sk));
}

export function make_signing_key_from_seed(seed) {
  const bytes = toBytes(seed);
  if (bytes.length !== SIGNING_KEY_LEN) {
    throw new Error('Invalid signing key seed length');
  }

  const signingKey = Fr.create(bytesToBigIntLE(concatBytes(bytes, bytes)));
  if (signingKey === 0n) {
    throw new Error('Invalid zero signing key seed');
  }
  return signingKey;
}

export function compressed_public_key_from_signing_key(sk) {
  return make_public_key_from_signing_key(sk).toRawBytes(true);
}

export function compressed_public_key_hex_from_seed(seed, { prefix = false } = {}) {
  const signingKey = make_signing_key_from_seed(seed);
  return bytesToHex(compressed_public_key_from_signing_key(signingKey), { prefix });
}

export function decode_public_key_hex(value) {
  return make_public_key_from_compressed_slice(hexToBytes(value));
}

export function decode_private_seed_hex(value) {
  return hexToBytes(value, SIGNING_KEY_LEN);
}
