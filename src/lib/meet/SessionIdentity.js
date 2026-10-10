import {
  bytesToHex,
  hexToBytes,
  make_public_key_from_compressed_slice,
  make_public_key_from_signing_key,
  make_signature_from_compressed_slice,
  make_signing_key_from_seed,
  sign,
  utf8ToBytes,
  verify,
} from '../crum_bls/index.js';

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Per-tab BLS identity. Replaces the wallet-derived key: it lives only in memory, its public key
 * is announced through Convex, and it signs every P2P message and masks this player's cards.
 */
export class SessionIdentity {
  constructor(seed, address) {
    this.seed = seed;
    this.address = address;
    this.signingKey = make_signing_key_from_seed(seed);
    this.publicKey = make_public_key_from_signing_key(this.signingKey);
    this.publicKeyHex = bytesToHex(this.publicKey.toRawBytes(true));
  }

  static generate() {
    return new SessionIdentity(randomBytes(32), bytesToHex(randomBytes(20), { prefix: true }));
  }

  sign(text) {
    return bytesToHex(sign(utf8ToBytes(text), this.signingKey).toRawBytes(true));
  }
}

/** Verifies a peer's signature against the public key it announced. */
export class PeerKey {
  constructor(publicKeyHex) {
    this.publicKey = make_public_key_from_compressed_slice(hexToBytes(publicKeyHex));
  }

  verifies(text, signatureHex) {
    try {
      return verify(utf8ToBytes(text), this.publicKey, make_signature_from_compressed_slice(hexToBytes(signatureHex)));
    } catch {
      return false;
    }
  }
}
