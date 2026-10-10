import { bytesToHex as nobleBytesToHex, hexToBytes as nobleHexToBytes } from '@noble/curves/abstract/utils';

export function stripHexPrefix(value) {
  return String(value ?? '').trim().replace(/^0x/i, '');
}

export function ensureHexPrefix(value) {
  const hex = stripHexPrefix(value);
  return `0x${hex}`;
}

export function bytesToHex(bytes, { prefix = false } = {}) {
  const hex = nobleBytesToHex(bytes);
  return prefix ? `0x${hex}` : hex;
}

export function hexToBytes(value, expectedLength) {
  const bytes = nobleHexToBytes(stripHexPrefix(value));
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error(`expected ${expectedLength}-byte hex value`);
  }
  return bytes;
}

export function utf8ToBytes(value) {
  return new TextEncoder().encode(value);
}

export function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

export function concatBytes(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') return hexToBytes(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError('expected bytes or hex string');
}

export function cloneBytes(bytes) {
  return Uint8Array.from(bytes);
}

export function bytesToBigIntLE(bytes) {
  let value = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    value = (value << 8n) + BigInt(bytes[i]);
  }
  return value;
}

export function bigIntToBytesLE(value, length) {
  let remaining = BigInt(value);
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

export function u64ToBytesBE(value) {
  let remaining = BigInt(value);
  const out = new Uint8Array(8);
  for (let i = 7; i >= 0; i -= 1) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}
