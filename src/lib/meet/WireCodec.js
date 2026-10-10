import { bytesToHex, hexToBytes } from '../crum_bls/index.js';

const BYTES_TAG = '$hex';

/** JSON with Uint8Array fields carried as tagged hex strings. */
export const WireCodec = Object.freeze({
  encode(value) {
    return JSON.stringify(value, (_key, field) => (
      field instanceof Uint8Array ? { [BYTES_TAG]: bytesToHex(field) } : field
    ));
  },

  decode(text) {
    return JSON.parse(text, (_key, field) => (
      field && typeof field === 'object' && typeof field[BYTES_TAG] === 'string' ? hexToBytes(field[BYTES_TAG]) : field
    ));
  },
});
