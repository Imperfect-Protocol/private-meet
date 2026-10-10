/** private-mesh bootstrap endpoints and STUN servers (same deployment as Private Poker). */
const DEFAULT_MESH_URLS = ['https://private-mesh.wasmer.app/mesh'];

const configured = String(import.meta.env?.VITE_PRIVATE_MESH_URLS ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const MESH_URLS = configured.length > 0 ? configured : DEFAULT_MESH_URLS;

export const MESH_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
