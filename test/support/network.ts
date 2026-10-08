/**
 * Helpers for mounting components against a network store
 */
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { createNetworkStore, NetworkKey, type NetworkStore } from '~/composables/useNetwork';
import { createBroadcastAnimations, type BroadcastAnimationsOptions } from '~/composables/useBroadcastAnimations';

/**
 * Network store with a paused simulation and a controllable animation clock
 * @param ids - Nodes to create
 * @param connections - Pairs of node ids to connect
 * @param animationOptions - Overrides for the animation store
 */
export function createTestNetwork(
  ids: string[] = [],
  connections: [string, string][] = [],
  animationOptions: BroadcastAnimationsOptions = {},
): NetworkStore {
  const network = createNetworkStore({
    animations: createBroadcastAnimations({ reducedMotion: () => false, ...animationOptions }),
  });
  ids.forEach(id => network.addNode(id));
  connections.forEach(([a, b]) => network.connect(a, b));
  return network;
}

type MountOptions = Parameters<typeof mountSuspended>[1];

/**
 * mountSuspended with the network store provided
 */
export function mountWithNetwork<T>(component: T, network: NetworkStore, options: MountOptions = {}) {
  return mountSuspended(component as any, {
    ...options,
    global: {
      ...options?.global,
      provide: { ...(options?.global?.provide as object), [NetworkKey as symbol]: network },
    },
  });
}
