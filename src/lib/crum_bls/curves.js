import { bls12_381 } from '@noble/curves/bls12-381';
import { keccak_256 } from '@noble/hashes/sha3';

function padDigestTo64(digest) {
  const output = new Uint8Array(64);
  output.set(digest, 0);
  return output;
}

function keccak256PaddedTo64(message) {
  return padDigestTo64(keccak_256(message));
}

keccak256PaddedTo64.blockLen = 64;
keccak256PaddedTo64.outputLen = 64;
keccak256PaddedTo64.create = () => {
  const hash = keccak_256.create();
  return {
    update(data) {
      hash.update(data);
      return this;
    },
    digest() {
      return padDigestTo64(hash.digest());
    },
  };
};

export const bls = bls12_381;
export const G1 = bls12_381.G1.ProjectivePoint;
export const G2 = bls12_381.G2.ProjectivePoint;
export const Fr = bls12_381.fields.Fr;
export const Fp12 = bls12_381.fields.Fp12;
export const RUST_HASH_TO_CURVE_DST = 'BLS_SIG_BLS12381G2_XMD:KECCAK-256_SSWU_RO_';
export const rustKeccakXmdHash = keccak256PaddedTo64;
