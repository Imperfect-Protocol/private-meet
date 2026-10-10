import { VirtualNetwork, VirtualNetworkLogFormatter } from 'privatepoker-p2p';
import { PeerKey } from './SessionIdentity.js';
import { WireCodec } from './WireCodec.js';
import { MESH_ICE_SERVERS, MESH_URLS } from './mesh.js';

const LOBBY_ID = 'private-meet';
const INBOUND = 'meet-in';
const OUTBOUND = 'meet-out';
const CONNECT_TIMEOUT_MS = 15_000;
const RETRY_MS = 2_000;

/** Link to the other seat. Initial: Idle. Final: Closed. Error: Failed (retried automatically). */
export const LinkState = Object.freeze({
  Idle: 'Idle',
  Connecting: 'Connecting',
  Connected: 'Connected',
  Disconnected: 'Disconnected',
  Failed: 'Failed',
  Closed: 'Closed',
});

/**
 * One authenticated P2P link to the other player, bootstrapped by private-mesh through
 * privatepoker-p2p. Every message is BLS-signed with this tab's session key and verified
 * against the key the peer announced in Convex.
 */
export class MeetLink {
  constructor({ identity, meetingId, onEvent }) {
    this.identity = identity;
    this.meetingId = String(meetingId);
    this.onEvent = onEvent;
    this.state = LinkState.Idle;
    this.peer = null;
    this.peerKey = null;
    this.retryTimer = null;
    this.network = new VirtualNetwork((event) => this.handle(event), identity.address, identity.seed, {
      lobbyId: LOBBY_ID,
      tableId: this.meetingId,
      meshUrls: MESH_URLS,
      iceServers: MESH_ICE_SERVERS,
      broadcastPrefix: LOBBY_ID,
      role: 'table',
    });
  }

  /** Connects (or reconnects) to the peer announced for the other seat. */
  connect(peer) {
    if (this.state === LinkState.Closed) return;
    if (this.peer?.peerAddress === peer.peerAddress && this.peer?.publicKey === peer.publicKey) return;
    if (this.peer) this.network.unsubscribe(INBOUND);
    this.peer = peer;
    this.peerKey = new PeerKey(peer.publicKey);
    this.subscribe();
  }

  subscribe() {
    clearTimeout(this.retryTimer);
    this.setState(LinkState.Connecting);
    this.network.subscribe(INBOUND, OUTBOUND, this.peer.peerAddress, CONNECT_TIMEOUT_MS, LOBBY_ID, this.meetingId);
  }

  retry() {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.peer && this.state !== LinkState.Connected && this.state !== LinkState.Closed) this.subscribe();
    }, RETRY_MS);
  }

  send(message) {
    if (this.state !== LinkState.Connected) return false;
    const body = WireCodec.encode(message);
    return this.network.send(OUTBOUND, { body, sig: this.identity.sign(body) }).ok;
  }

  setLocalStream(stream) {
    this.network.setLocalStream(stream);
  }

  close() {
    clearTimeout(this.retryTimer);
    this.setState(LinkState.Closed);
    this.network.close();
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.onEvent({ type: 'state', state });
  }

  isFromPeer(event) {
    return this.peer && String(event.peerAddress).toLowerCase() === this.peer.peerAddress.toLowerCase();
  }

  handle(event) {
    if (this.state === LinkState.Closed) return;
    if (event.type !== 'MessageReceived' && event.type !== 'MessageDelivered') {
      this.onEvent({ type: 'log', line: VirtualNetworkLogFormatter.text(this.identity.address, event) });
    }
    switch (event.type) {
      case 'PeerConnected':
        if (this.isFromPeer(event)) this.setState(LinkState.Connected);
        break;
      case 'PeerDisconnected':
        if (!this.isFromPeer(event)) break;
        this.setState(LinkState.Disconnected);
        this.retry();
        break;
      case 'ConnectionTimeout':
      case 'ConnectionFailed':
        if (!this.isFromPeer(event) || this.state === LinkState.Connected) break;
        this.setState(LinkState.Failed);
        this.retry();
        break;
      case 'MessageReceived':
        this.receive(event);
        break;
      case 'MediaStream':
        if (this.isFromPeer(event)) this.onEvent({ type: 'media', stream: event.stream });
        break;
      default:
        break;
    }
  }

  receive(event) {
    const data = event.messageData;
    if (!this.isFromPeer(event) || typeof data?.body !== 'string') return;
    if (!this.peerKey.verifies(data.body, data.sig)) {
      this.onEvent({ type: 'log', line: 'Rejected peer message: invalid signature' });
      return;
    }
    this.onEvent({ type: 'message', message: WireCodec.decode(data.body) });
  }
}
