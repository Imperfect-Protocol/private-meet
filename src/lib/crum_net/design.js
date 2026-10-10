export const NetworkRole = Object.freeze({
  ClientServer: "ClientServer",
  PeerToPeer: "PeerToPeer",
});

export class TableSpec {
  constructor(lobby_id, topology) {
    this.lobby_id = lobby_id;
    this.topology = topology;
    this.min_players = 2;
    this.max_players = 9;
    this.buy_in_chips = 0;
    this.metadata = null;
  }

  static new(lobby_id, topology) {
    return new TableSpec(lobby_id, topology);
  }

  with_player_limits(min_players, max_players) {
    this.min_players = min_players;
    this.max_players = max_players;
    return this;
  }

  with_buy_in_chips(buy_in_chips) {
    this.buy_in_chips = buy_in_chips;
    return this;
  }

  with_metadata(metadata) {
    this.metadata = metadata;
    return this;
  }
}

export class TableHandle {
  constructor(lobby_id, table_id, topology) {
    this.lobby_id = lobby_id;
    this.table_id = table_id;
    this.topology = topology;
    this.seated = [];
    this.hand_id = null;
  }

  static new(lobby_id, table_id, topology) {
    return new TableHandle(lobby_id, table_id, topology);
  }

  with_seated(seated) {
    this.seated = seated;
    return this;
  }

  with_hand_id(hand_id) {
    this.hand_id = hand_id;
    return this;
  }

  seat(player_index) {
    return this.seated.find((peer) => peer.player_index === player_index) ?? null;
  }
}

export class SignalBundle {
  constructor(table_id, from, recipients, encrypted_data) {
    this.table_id = table_id;
    this.hand_id = null;
    this.from = from;
    this.recipients = recipients;
    this.encrypted_data = encrypted_data;
  }

  static new(table_id, from, recipients, encrypted_data) {
    return new SignalBundle(table_id, from, recipients, encrypted_data);
  }

  with_hand_id(hand_id) {
    this.hand_id = hand_id;
    return this;
  }
}

export class NetworkRunRequest {
  constructor(table, role, local_peer_id, local_player_index) {
    this.table = table;
    this.role = role;
    this.local_peer_id = local_peer_id;
    this.local_player_index = local_player_index;
  }

  static new(table, role, local_peer_id, local_player_index) {
    return new NetworkRunRequest(table, role, local_peer_id, local_player_index);
  }
}

export const LobbyCommand = Object.freeze({
  CreateTable: ({ spec, annonce_public_key }) => ({
    type: "CreateTable",
    spec,
    annonce_public_key,
  }),
  JoinTable: ({ table_id, annonce_public_key }) => ({
    type: "JoinTable",
    table_id,
    annonce_public_key,
  }),
  LeaveTable: ({ table_id }) => ({ type: "LeaveTable", table_id }),
  StartHand: ({ table_id }) => ({ type: "StartHand", table_id }),
  SendSignal: (signal_bundle) => ({ type: "SendSignal", signal_bundle }),
  RunNetwork: (request) => ({ type: "RunNetwork", request }),
});

export const NetworkEvent = Object.freeze({
  TableCreated: ({ table }) => ({ type: "TableCreated", table }),
  TableJoined: ({ table, player_index }) => ({ type: "TableJoined", table, player_index }),
  PlayerAnnounced: (peer_announcement) => ({ type: "PlayerAnnounced", peer_announcement }),
  SignalReceived: (handshake_signal) => ({ type: "SignalReceived", handshake_signal }),
  SignalPublished: (signal_bundle) => ({ type: "SignalPublished", signal_bundle }),
  HandStarted: ({ table_id, hand_id }) => ({ type: "HandStarted", table_id, hand_id }),
  PokerActionReceived: (envelope) => ({ type: "PokerActionReceived", envelope }),
  PokerActionBroadcast: (envelope) => ({ type: "PokerActionBroadcast", envelope }),
  SyncFrameReceived: (frame) => ({ type: "SyncFrameReceived", frame }),
  NetworkReady: ({ table_id, connected_peers }) => ({
    type: "NetworkReady",
    table_id,
    connected_peers,
  }),
  NetworkStopped: ({ table_id }) => ({ type: "NetworkStopped", table_id }),
  Error: ({ message }) => ({ type: "Error", message }),
});

export const PlayerEvent = Object.freeze({
  CommandAccepted: (command) => ({ type: "CommandAccepted", command }),
  Network: (event) => ({ type: "Network", event }),
  LocalActionRequested: (action) => ({ type: "LocalActionRequested", action }),
  Tick: { type: "Tick" },
});

export class PlayerContext {
  constructor(role, local_peer_id) {
    this.role = role;
    this.local_peer_id = local_peer_id;
    this.local_player_index = null;
    this.table = null;
    this.poker = null;
  }

  static new(role, local_peer_id) {
    return new PlayerContext(role, local_peer_id);
  }

  static for_table(role, local_peer_id, local_player_index, table) {
    const context = new PlayerContext(role, local_peer_id);
    context.local_player_index = local_player_index;
    context.table = table;
    return context;
  }

  attach_poker_state(poker) {
    this.poker = poker;
  }

  set_table(table) {
    const seated = table.seated.find((peer) => peer.peer_id === this.local_peer_id);
    this.local_player_index = seated?.player_index ?? this.local_player_index;
    this.table = table;
  }

  table_id() {
    return this.table?.table_id ?? null;
  }
}

export const PlayerCommand = Object.freeze({
  Lobby: (command) => ({ type: "Lobby", command }),
  SubmitPokerAction: (action) => ({ type: "SubmitPokerAction", action }),
  BroadcastPokerAction: (envelope) => ({ type: "BroadcastPokerAction", envelope }),
  SendPokerAction: ({ peer_id, envelope }) => ({ type: "SendPokerAction", peer_id, envelope }),
  EmitSyncFrame: (frame) => ({ type: "EmitSyncFrame", frame }),
});

export class PlayerAct {
  constructor(commands = []) {
    this.commands = commands;
  }

  static new() {
    return new PlayerAct();
  }

  static single(command) {
    return new PlayerAct([command]);
  }

  push(command) {
    this.commands.push(command);
  }

  is_empty() {
    return this.commands.length === 0;
  }
}

export function create_table_command(spec, annonce_public_key) {
  return LobbyCommand.CreateTable({ spec, annonce_public_key });
}

export function join_table_command(table_id, annonce_public_key) {
  return LobbyCommand.JoinTable({ table_id, annonce_public_key });
}

export function start_hand_command(table_id) {
  return LobbyCommand.StartHand({ table_id });
}

export function run_network_command(request) {
  return LobbyCommand.RunNetwork(request);
}

export function handle_action_command(envelope) {
  return PlayerCommand.BroadcastPokerAction(envelope);
}
