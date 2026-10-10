import { bls12_381 } from '@noble/curves/bls12-381';
import { bytesToHex, bytesToUtf8, ensureHexPrefix, hexToBytes, utf8ToBytes } from './bytes.js';

async function deriveAesKeyFromSharedPoint(sharedPointBytes) {
  const digest = await crypto.subtle.digest('SHA-256', sharedPointBytes);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function deriveG1SharedPoint(privateKeyBytes, publicKeyBytes) {
  const scalar = bls12_381.G1.normPrivateKeyToScalar(privateKeyBytes);
  return bls12_381.G1.ProjectivePoint
    .fromHex(publicKeyBytes)
    .multiply(scalar)
    .toRawBytes(true);
}

export async function encryptForPeerAesGcmPayload(recipientPubKeyHex, message) {
  const ephemeralPrivKey = bls12_381.utils.randomPrivateKey();
  const ephemeralPubKey = bls12_381.getPublicKey(ephemeralPrivKey);
  const recipientPubKey = hexToBytes(recipientPubKeyHex);
  const sharedPoint = deriveG1SharedPoint(ephemeralPrivKey, recipientPubKey);
  const cryptoKey = await deriveAesKeyFromSharedPoint(sharedPoint);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, utf8ToBytes(message));

  return {
    ephemeralPubKey: bytesToHex(ephemeralPubKey, { prefix: true }),
    iv: bytesToHex(iv, { prefix: true }),
    ciphertext: bytesToHex(new Uint8Array(ciphertext), { prefix: true }),
  };
}

export async function decryptFromPeerAesGcmPayload(myPrivKeyHex, encryptedPayload) {
  const { ephemeralPubKey, iv, ciphertext } = encryptedPayload;
  const myPrivKey = hexToBytes(ensureHexPrefix(myPrivKeyHex));
  const theirsPubKey = hexToBytes(ensureHexPrefix(ephemeralPubKey));
  const sharedPoint = deriveG1SharedPoint(myPrivKey, theirsPubKey);
  const cryptoKey = await deriveAesKeyFromSharedPoint(sharedPoint);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(ensureHexPrefix(iv)) },
    cryptoKey,
    hexToBytes(ensureHexPrefix(ciphertext))
  );
  return bytesToUtf8(new Uint8Array(decrypted));
}
