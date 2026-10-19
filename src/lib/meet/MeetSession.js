import { ChatLog } from './ChatLog.js';
import { ChessSession } from '../chess/ChessSession.ts';
import { HeadsUpMatch } from './HeadsUpMatch.js';
import { MediaSession } from './MediaSession.js';
import { LinkState, MeetLink } from './MeetLink.js';
import { PeerKey, SessionIdentity } from './SessionIdentity.js';

const MAX_CONSOLE_LINES = 400;
const CHAT = 'chat';

/**
 * Everything one tab owns at a meeting table: session identity, the P2P link, the poker match,
 * chat and media. React subscribes to it; no protocol logic lives in hooks.
 */
export class MeetSession {
  constructor({ meetingId, seat, kind = 'poker' }) {
    this.seat = seat;
    this.identity = SessionIdentity.generate();
    this.listeners = new Set();
    this.version = 0;
    this.cachedView = null;
    this.consoleLines = [];
    this.chat = new ChatLog();
    this.link = new MeetLink({ identity: this.identity, meetingId, onEvent: (event) => this.handleLink(event) });
    this.kind = kind;
    this.match = this.createMatch();
    this.media = new MediaSession({ link: this.link, onChange: () => this.changed() });
    this.media.start();
  }

  createMatch() {
    const send = (message) => this.link.send(message);
    const onChange = () => this.changed();
    if (this.kind === 'chess') return new ChessSession({ seat: this.seat, identity: this.identity, send, onChange, log: (line) => this.print('Chess', line) });
    return new HeadsUpMatch({ seat: this.seat, identity: this.identity, send, onChange, log: (line) => this.print('Game', line) });
  }

  /** Public announcement for Convex: who to connect to and which key verifies our messages. */
  announcement() {
    return { peerAddress: this.identity.address, publicKey: this.identity.publicKeyHex };
  }

  setPeer(peer) {
    if (!peer) return;
    if (this.kind === 'chess') this.match.setPeerKey(new PeerKey(peer.publicKey));
    this.link.connect(peer);
  }

  handleLink(event) {
    switch (event.type) {
      case 'state':
        this.print('Net', `Link ${event.state}`);
        if (event.state === LinkState.Connected) {
          this.media.peerConnected();
          this.match.connect();
        }
        if (event.state === LinkState.Disconnected || event.state === LinkState.Connecting || event.state === LinkState.Failed) {
          this.media.peerLost();
          this.match.disconnect();
        }
        break;
      case 'message':
        if (event.message.kind === CHAT) {
          const message = this.chat.addIncoming(1 - this.seat, event.message.text, event.message.at);
          if (message) this.print('Chat', `Them: ${message.text}`);
        } else if (this.match) {
          this.match.receive(event.message);
        }
        break;
      case 'media':
        this.media.remote(event.stream);
        break;
      case 'log':
        this.print('Net', event.line);
        break;
      default:
        break;
    }
    this.changed();
  }

  sendChat(text) {
    if (this.link.state !== LinkState.Connected) return false;
    const clean = String(text ?? '').trim().slice(0, 500);
    if (!clean) return false;
    const at = Date.now();
    if (!this.link.send({ kind: CHAT, text: clean, at })) return false;
    const message = this.chat.add(this.seat, clean, at);
    this.print('Chat', `Me: ${message.text}`);
    this.changed();
    return true;
  }

  setChatOpen(isOpen) {
    this.chat.setOpen(isOpen);
    this.changed();
  }

  print(source, line) {
    this.consoleLines = [...this.consoleLines, { at: Date.now(), source, line }].slice(-MAX_CONSOLE_LINES);
    this.changed();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  changed() {
    this.version += 1;
    this.cachedView = null;
    this.listeners.forEach((listener) => listener());
  }

  /** Stable snapshot for useSyncExternalStore. */
  view() {
    if (!this.cachedView) {
      this.cachedView = {
        version: this.version,
        linkState: this.link.state,
        kind: this.kind,
        game: this.match ? this.match.view() : null,
        media: {
          state: this.media.state,
          localStream: this.media.localStream,
          remoteStream: this.media.remoteStream,
          videoOn: this.media.videoOn,
          error: this.media.error,
        },
        chat: { messages: this.chat.messages, unread: this.chat.unread, isOpen: this.chat.isOpen },
        consoleLines: this.consoleLines,
      };
    }
    return this.cachedView;
  }

  close() {
    this.match.close();
    this.media.close();
    this.link.close();
    this.listeners.clear();
  }
}
