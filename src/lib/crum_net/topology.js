export const TopologyPolicy = Object.freeze({
  Ring: "Ring",
  Mesh: "Mesh",
  RingOneBackup: "RingOneBackup",
  RingTwoBackups: "RingTwoBackups",
});

export class SeatedPeer {
  constructor({ player_index, peer_id }) {
    this.player_index = player_index;
    this.peer_id = peer_id;
  }

  clone() {
    return new SeatedPeer({
      player_index: this.player_index,
      peer_id: this.peer_id,
    });
  }
}

export function expected_peers(topology, self_index, seated) {
  if (seated.length < 2 || self_index >= seated.length) {
    return [];
  }

  switch (topology) {
    case TopologyPolicy.Mesh:
      return seated
        .filter((peer) => peer.player_index !== self_index)
        .map(cloneSeatedPeer);
    case TopologyPolicy.Ring:
      return ring_neighbors(self_index, seated, 1);
    case TopologyPolicy.RingOneBackup:
      return ring_neighbors(self_index, seated, 2);
    case TopologyPolicy.RingTwoBackups:
      return ring_neighbors(self_index, seated, 3);
    default:
      return [];
  }
}

export function outbound_offer_targets(topology, self_index, seated) {
  return expected_peers(topology, self_index, seated)
    .filter((peer) => self_index < peer.player_index);
}

function ring_neighbors(self_index, seated, backup_depth) {
  const count = seated.length;
  const peers = [];
  const maxDistance = Math.min(backup_depth, Math.max(count - 1, 0));

  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const previous = (self_index + count - distance) % count;
    const next = (self_index + distance) % count;

    push_unique_peer(peers, cloneSeatedPeer(seated[previous]));
    push_unique_peer(peers, cloneSeatedPeer(seated[next]));
  }

  return peers;
}

function push_unique_peer(peers, peer) {
  if (peers.some((existing) => existing.player_index === peer.player_index)) {
    return;
  }
  peers.push(peer);
}

function cloneSeatedPeer(peer) {
  return peer instanceof SeatedPeer ? peer.clone() : new SeatedPeer(peer);
}
