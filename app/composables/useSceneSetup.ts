/**
 * Scene Setup Composable
 * Handles declarative scene initialization on top of the network store
 */

import type { GenesisConfig, SceneConfig } from '~/config/scenes';
import type { NetworkStore } from './useNetwork';
import SmlCommon from '~~/src/common';

export const GENESIS_DELAY = 1000;

export const useSceneSetup = () => {
  /**
   * Initialize a complete scene from configuration
   * @param config - Scene description (nodes, connections, genesis transaction)
   * @param network - Network store to populate
   * @returns Function cancelling the pending genesis transaction
   */
  const initializeScene = (config: SceneConfig, network: NetworkStore) => {
    config.nodes.forEach(node => network.addNode(node.id));

    config.connections.forEach((conn) => {
      if (!network.getNode(conn.from) || !network.getNode(conn.to)) {
        console.warn(`Connection failed: ${conn.from} -> ${conn.to}`);
        return;
      }
      network.connect(conn.from, conn.to);
    });

    if (config.genesis) {
      return setupGenesis(config.genesis, network);
    }
    return () => {};
  };

  /**
   * Issue the genesis transaction to the configured recipient
   */
  const setupGenesis = (genesisConfig: GenesisConfig, network: NetworkStore) => {
    const recipient = network.getNode(genesisConfig.recipient);
    if (!recipient) {
      console.warn(`Genesis recipient not found: ${genesisConfig.recipient}`);
      return () => {};
    }
    const genesisAcc = SmlCommon.generateKeyPair(genesisConfig.privateKey);
    const timer = setTimeout(() => {
      network.orderTransaction(
        recipient.id,
        SmlCommon.HexToBase58(genesisAcc.getPublic(true, 'hex')),
        recipient.address,
        genesisConfig.amount,
        genesisAcc,
      );
    }, GENESIS_DELAY);
    return () => clearTimeout(timer);
  };

  return {
    initializeScene,
  };
};
