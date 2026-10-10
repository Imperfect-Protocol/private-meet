import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from './bytes.js';
import { compressed_public_key_from_signing_key, make_signing_key_from_seed, SIGNING_KEY_LEN } from './util.js';

export const PRIVATE_POKER_DERIVATION_MESSAGE = 'Welcome to Private Poker!\n\n'
  + 'Sign this message to generate your secure in-game communication key. \n\n'
  + 'This key is used to encrypt your peer-to-peer WebRTC signals and verify your actions at the table.\n\n'
  + 'This request will not trigger a blockchain transaction or cost any gas.';

export class BlsIdentity {
  constructor({ private_key_hex, public_key_hex }) {
    this.private_key_hex = private_key_hex;
    this.public_key_hex = public_key_hex;
  }
}

export function derive_private_poker_bls_identity(ethereum_private_key) {
  return derive_private_poker_bls_identity_with_message(
    ethereum_private_key,
    PRIVATE_POKER_DERIVATION_MESSAGE
  );
}

export function derive_private_poker_bls_identity_with_message(ethereum_private_key, message) {
  const signatureMaterial = wallet_signature_material(ethereum_private_key, message);
  const seed = keccak_256(signatureMaterial);
  const signingKey = make_signing_key_from_seed(seed);
  const publicKey = compressed_public_key_from_signing_key(signingKey);

  return new BlsIdentity({
    private_key_hex: bytesToHex(seed),
    public_key_hex: bytesToHex(publicKey),
  });
}

export function wallet_signature_material(ethereum_private_key, message) {
  const privateKey = decode_hex_32(ethereum_private_key);
  return keccak_256(concatBytes(privateKey, utf8ToBytes(message)));
}

export function decode_hex_32(value) {
  return hexToBytes(value, SIGNING_KEY_LEN);
}
