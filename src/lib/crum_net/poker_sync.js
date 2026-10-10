import { P2pMessage, PokerClientState } from "./messages.js";

export class PokerSyncClient {
  constructor(player_index, table_id, hand_id, peers, table, transport) {
    this.peers = peers;
    this.client = PokerClientState.new(player_index, table_id, hand_id, table);
    this.transport = transport;
  }

  static new(player_index, table_id, hand_id, peers, table, transport) {
    return new PokerSyncClient(player_index, table_id, hand_id, peers, table, transport);
  }

  submit_local_action(action) {
    const envelope = this.client.submit_local_action(action);
    this.broadcast(envelope);
  }

  poll_and_apply() {
    let applied = 0;
    while (true) {
      const polled = this.transport.poll();
      if (polled == null) {
        break;
      }
      const [, message] = polled;
      if (this.apply_message(message)) {
        applied += 1;
      }
    }
    return applied;
  }

  apply_message(message) {
    if (message.type !== "PokerAction") {
      return false;
    }
    return this.client.apply_envelope(message.envelope);
  }

  current_hand() {
    return this.client.current_hand();
  }

  broadcast(envelope) {
    for (const peer of [...this.peers]) {
      this.transport.send(peer, P2pMessage.PokerAction(envelope));
    }
  }
}
