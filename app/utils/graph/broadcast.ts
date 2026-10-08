/**
 * Broadcast routing helpers
 *
 * Pure functions describing which network edges a broadcast (transaction or block)
 * travels along. Kept free of Vue so they can be unit tested in isolation.
 */

/**
 * Canonical, direction-independent id for the connection between two nodes.
 * Connections in the simulation are bidirectional, so `edgeId('A', 'B') === edgeId('B', 'A')`.
 * @param a - First node id
 * @param b - Second node id
 */
export function edgeId(a: string, b: string): string {
  return a < b ? `${a}--${b}` : `${b}--${a}`;
}

/**
 * Resolve the neighbours a broadcast is relayed to.
 *
 * A node that originated the message (sender === referrer) sends it along every edge.
 * A node that relays a message received from `referrerId` skips the edge back to it.
 *
 * @param senderId - Node emitting the broadcast
 * @param referrerId - Node the message originally came from
 * @param neighborIds - Ids of all nodes connected to the sender
 * @returns Ids of the neighbours the broadcast travels to
 */
export function resolveBroadcastTargets(senderId: string, referrerId: string, neighborIds: readonly string[]): string[] {
  if (senderId === referrerId) {
    return [...neighborIds];
  }
  return neighborIds.filter(id => id !== referrerId);
}
