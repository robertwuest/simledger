/**
 * Broadcast animation store
 *
 * Keeps track of the packets (transactions / blocks) currently travelling along
 * network edges. The store owns the packet lifecycle (creation and expiry);
 * edge components only render what is in here.
 */

import { shallowRef, type ShallowRef } from 'vue';
import { edgeId } from '~/utils/graph/broadcast';
import { PACKET_DURATION } from '~/utils/graph/motion';

export type PacketKind = 'tx' | 'block';

export interface Packet {
  id: number;
  kind: PacketKind;
  edgeId: string;
  fromId: string;
  toId: string;
  startedAt: number;
  duration: number;
}

export interface BroadcastAnimationsOptions {
  /** Travel time of a packet in ms */
  duration?: number;
  /** Clock used for packet start times, must match the clock used while rendering */
  now?: () => number;
  /** Whether the user prefers reduced motion */
  reducedMotion?: () => boolean;
}

export interface BroadcastAnimations {
  packets: Readonly<ShallowRef<readonly Packet[]>>;
  now: () => number;
  reducedMotion: () => boolean;
  launch(kind: PacketKind, fromId: string, toId: string): Packet;
  packetsFor(id: string): Packet[];
  purgeEdge(id: string): void;
  clear(): void;
}

/**
 * Whether the browser requests reduced motion
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Create a broadcast animation store
 * @param options - Duration, clock and reduced motion overrides
 */
export function createBroadcastAnimations(options: BroadcastAnimationsOptions = {}): BroadcastAnimations {
  const duration = options.duration ?? PACKET_DURATION;
  const now = options.now ?? (() => performance.now());
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion;
  const packets = shallowRef<Packet[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let counter = 0;

  function remove(ids: Set<number>) {
    ids.forEach((id) => {
      clearTimeout(timers.get(id));
      timers.delete(id);
    });
    packets.value = packets.value.filter(packet => !ids.has(packet.id));
  }

  function launch(kind: PacketKind, fromId: string, toId: string): Packet {
    const packet: Packet = {
      id: ++counter,
      kind,
      edgeId: edgeId(fromId, toId),
      fromId,
      toId,
      startedAt: now(),
      duration,
    };
    packets.value = [...packets.value, packet];
    timers.set(packet.id, setTimeout(() => remove(new Set([packet.id])), duration));
    return packet;
  }

  function packetsFor(id: string): Packet[] {
    return packets.value.filter(packet => packet.edgeId === id);
  }

  function purgeEdge(id: string) {
    remove(new Set(packetsFor(id).map(packet => packet.id)));
  }

  function clear() {
    remove(new Set(packets.value.map(packet => packet.id)));
  }

  return { packets, now, reducedMotion, launch, packetsFor, purgeEdge, clear };
}
