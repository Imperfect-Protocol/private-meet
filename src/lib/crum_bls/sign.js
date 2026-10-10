import { Fr } from './curves.js';
import { hash_to_curve } from './hash_to_curve.js';
import { normalizeSigningKey } from './util.js';

export function sign(data, k) {
  return hash_to_curve(data).multiply(normalizeSigningKey(k));
}

export function digest_to_g1(digest) {
  return hash_to_curve(digest);
}

export function sign_digest(digest, k) {
  return digest_to_g1(digest).multiply(normalizeSigningKey(k));
}

export function mask(g1, k) {
  return g1.multiply(normalizeSigningKey(k));
}

export function unmask(g1, k) {
  const signingKey = normalizeSigningKey(k);
  const inverse = Fr.inv(signingKey);
  return g1.multiply(inverse);
}
