export class Network {
  constructor({ connector, lobby, games = [], players = [] }) {
    this.connector = connector;
    this.lobby = lobby;
    this.games = games;
    this.players = players;
  }
}

export class NetworkConnector {}

export class PokerLobby {
  async run() {
    throw new Error("PokerLobby.run must be implemented by the concrete lobby");
  }
}

export class PokerGame {
  session() {
    throw new Error("PokerGame.session must be implemented by the concrete game");
  }

  session_mut() {
    return this.session();
  }
}

export class PokerGameSession {
  state() {
    throw new Error("PokerGameSession.state must be implemented by the concrete session");
  }

  state_mut() {
    return this.state();
  }

  connector() {
    throw new Error("PokerGameSession.connector must be implemented by the concrete session");
  }

  connector_mut() {
    return this.connector();
  }
}

export class BotGame {}

export class Bot {
  games() {
    throw new Error("Bot.games must be implemented by the concrete bot");
  }

  games_mut() {
    return this.games();
  }
}
