function rustError(message) {
  throw new Error(message);
}

function assertU64(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    rustError(`${name} must be a non-negative safe integer`);
  }
}

export class PokerBettingState {
  constructor(num_players, initial_chips) {
    if (!Array.isArray(initial_chips) || initial_chips.length !== num_players) {
      rustError("initial_chips must contain one chip count per player");
    }
    initial_chips.forEach((chips, player) => {
      assertU64(chips, `initial_chips[${player}]`);
    });
    this.player_chips = [...initial_chips];
    this.current_round_bets = Array(num_players).fill(null);
    this.pot = 0;
    this.active_players = Array(num_players).fill(true);
    this.allin_players = initial_chips.map((chips) => chips === 0);
    this.current_highest_bet = 0;
  }

  static new(num_players, initial_chips) {
    return new PokerBettingState(num_players, initial_chips);
  }

  clone() {
    const state = new PokerBettingState(0, []);
    state.player_chips = [...this.player_chips];
    state.current_round_bets = [...this.current_round_bets];
    state.pot = this.pot;
    state.active_players = [...this.active_players];
    state.allin_players = [...this.allin_players];
    state.current_highest_bet = this.current_highest_bet;
    return state;
  }

  call_amount_required(player) {
    if (!this.active_players[player]) {
      return rustError("Player has already folded");
    }

    const amount_needed_to_call =
      this.current_highest_bet - (this.current_round_bets[player] ?? 0);

    return amount_needed_to_call;
  }

  chips_remaining(player) {
    return this.player_chips[player];
  }

  get_active_players() {
    return this.active_players;
  }

  get_betting_players() {
    return this.active_players.map((active, player) => (
      active && !this.allin_players[player]
    ));
  }

  process_action(player, amount) {
    assertU64(amount, "amount");
    if (!this.active_players[player]) {
      return rustError("Player has already folded");
    }
    if (this.allin_players[player]) {
      return rustError("Player is already all-in");
    }
    if (this.player_chips[player] < amount) {
      return rustError("Not enough chips in stack");
    }

    const amount_needed_to_call =
      this.current_highest_bet - (this.current_round_bets[player] ?? 0);

    if (amount === 0) {
      if (amount_needed_to_call > 0) {
        this.active_players[player] = false;
      } else {
        this.current_round_bets[player] = 0;
      }
    } else {
      const is_all_in = amount === this.player_chips[player];
      if (amount < amount_needed_to_call && !is_all_in) {
        return rustError("Amount is less than the required call amount");
      }

      this.player_chips[player] -= amount;
      this.current_round_bets[player] = amount + (this.current_round_bets[player] ?? 0);
      this.pot += amount;

      if (this.current_round_bets[player] > this.current_highest_bet) {
        this.current_highest_bet = this.current_round_bets[player] ?? 0;
      }

      if (this.player_chips[player] === 0) {
        this.allin_players[player] = true;
      }
    }
  }

  is_betting_round_complete() {
    const active_count = this.active_players.filter((active) => active).length;
    const betting_count = this.get_betting_players().filter(Boolean).length;

    if (active_count <= 1 || betting_count <= 1) {
      if (betting_count === 1 && this.current_highest_bet > 0) {
        const betting_player = this.get_betting_players().findIndex(Boolean);
        const player_bet = this.current_round_bets[betting_player] ?? 0;
        return player_bet >= this.current_highest_bet;
      }
      return true;
    }

    for (let player = 0; player < this.active_players.length; player += 1) {
      const is_active = this.active_players[player];
      if (!is_active) {
        continue;
      }
      if (this.allin_players[player]) {
        continue;
      }
      const player_bet = this.current_round_bets[player];
      if (player_bet == null) {
        return false;
      }
      if (player_bet < this.current_highest_bet) {
        return false;
      }
    }

    return true;
  }

  refund_uncalled_bets() {
    const active_bets = this.active_players
      .map((active, player) => (active ? this.current_round_bets[player] ?? 0 : null))
      .filter((bet) => bet != null)
      .sort((left, right) => right - left);

    if (active_bets.length < 2) {
      return;
    }

    const called_bet = active_bets[1];
    for (let player = 0; player < this.active_players.length; player += 1) {
      if (!this.active_players[player]) {
        continue;
      }

      const player_bet = this.current_round_bets[player] ?? 0;
      if (player_bet <= called_bet) {
        continue;
      }

      const refund = player_bet - called_bet;
      this.current_round_bets[player] = called_bet;
      this.player_chips[player] += refund;
      this.pot -= refund;
      this.allin_players[player] = this.player_chips[player] === 0;
    }

    this.current_highest_bet = Math.max(0, ...this.current_round_bets.map((bet) => bet ?? 0));
  }

  next_street() {
    this.current_round_bets.fill(null);
    this.current_highest_bet = 0;
  }
}
