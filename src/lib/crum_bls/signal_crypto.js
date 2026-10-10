import { keccak_256 } from '@noble/hashes/sha3';
import { G2 } from './curves.js';
import { bytesToHex, concatBytes, hexToBytes, toBytes, u64ToBytesBE } from './bytes.js';
import {
  PUBLIC_KEY_COMPRESSED_LEN,
  compressed_public_key_from_signing_key,
  decode_private_seed_hex,
  decode_public_key_hex,
  make_public_key_from_compressed_slice,
  make_signing_key_from_seed,
} from './util.js';

function randomSeed() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('crypto.getRandomValues is required for signal encryption');
  }
  const seed = new Uint8Array(32);
  cryptoApi.getRandomValues(seed);
  return seed;
}

export function encrypt_signal_for_peer(recipient_public_key_hex, plaintext) {
  const recipientPublicKey = decode_public_key_hex(recipient_public_key_hex);
  const seed = randomSeed();
  const ephemeralKey = make_signing_key_from_seed(seed);
  const ephemeralPublicKey = compressed_public_key_from_signing_key(ephemeralKey);
  const sharedPoint = recipientPublicKey.multiply(ephemeralKey).toRawBytes(true);
  const ciphertext = xor_with_keccak_stream(sharedPoint, toBytes(plaintext));

  return concatBytes(ephemeralPublicKey, ciphertext);
}

export function decrypt_signal_from_peer(private_key_seed_hex, encrypted) {
  const encryptedBytes = toBytes(encrypted);
  if (encryptedBytes.length < PUBLIC_KEY_COMPRESSED_LEN) {
    throw new Error('encrypted signal is shorter than ephemeral public key');
  }
  const privateSeed = decode_private_seed_hex(private_key_seed_hex);
  const privateKey = make_signing_key_from_seed(privateSeed);
  const ephemeralPublicKey = make_public_key_from_compressed_slice(
    encryptedBytes.slice(0, PUBLIC_KEY_COMPRESSED_LEN)
  );
  const sharedPoint = ephemeralPublicKey.multiply(privateKey).toRawBytes(true);
  return xor_with_keccak_stream(sharedPoint, encryptedBytes.slice(PUBLIC_KEY_COMPRESSED_LEN));
}

export function encrypt_signal_for_peer_hex(recipient_public_key_hex, plaintext, { prefix = false } = {}) {
  return bytesToHex(encrypt_signal_for_peer(recipient_public_key_hex, plaintext), { prefix });
}

export function decrypt_signal_from_peer_hex(private_key_seed_hex, encrypted_hex) {
  return decrypt_signal_from_peer(private_key_seed_hex, hexToBytes(encrypted_hex));
}

export function xor_with_keccak_stream(shared_point, input) {
  const sharedPointBytes = toBytes(shared_point);
  const inputBytes = toBytes(input);
  const output = new Uint8Array(inputBytes.length);
  let counter = 0n;
  for (let offset = 0; offset < inputBytes.length; offset += 32) {
    const mask = keccak_256(concatBytes(sharedPointBytes, u64ToBytesBE(counter)));
    const chunkLength = Math.min(32, inputBytes.length - offset);
    for (let i = 0; i < chunkLength; i += 1) {
      output[offset + i] = inputBytes[offset + i] ^ mask[i];
    }
    counter += 1n;
  }
  return output;
}

export function derive_signal_shared_point_for_test(public_key_hex, private_key_seed_hex) {
  const publicKey = G2.fromHex(hexToBytes(public_key_hex));
  const privateKey = make_signing_key_from_seed(decode_private_seed_hex(private_key_seed_hex));
  return publicKey.multiply(privateKey).toRawBytes(true);
}
