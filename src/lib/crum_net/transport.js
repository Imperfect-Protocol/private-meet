export class MemoryTransport {
  constructor() {
    this.outbound = new Map();
    this.inbound = [];
  }

  static default() {
    return new MemoryTransport();
  }

  push_inbound(from, message) {
    this.inbound.push([from, message]);
  }

  drain_outbound_for(peer_id) {
    const messages = this.outbound.get(peer_id) ?? [];
    this.outbound.delete(peer_id);
    return messages;
  }

  send(peer_id, message) {
    const messages = this.outbound.get(peer_id) ?? [];
    messages.push(message);
    this.outbound.set(peer_id, messages);
  }

  poll() {
    return this.inbound.shift() ?? null;
  }
}
