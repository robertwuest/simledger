/**
 * Scene Setup Composable
 * Handles declarative scene initialization within Vue components
 */

import type { SceneConfig } from '~/config/scenes';
import SmlCommon from '~~/src/common';

export const useSceneSetup = () => {
  /**
   * Initialize a complete scene from configuration
   */
  const initializeScene = async (config: SceneConfig, dashboard: any) => {
    if (!dashboard) {
      console.error('Dashboard instance is required');
      return;
    }

    // Create all nodes
    const nodeMap = new Map<string, any>();
    for (const nodeConfig of config.nodes) {
      const node = dashboard.addNode(nodeConfig.id);
      nodeMap.set(nodeConfig.id, node);
    }

    // Connect nodes
    for (const conn of config.connections) {
      const nodeA = nodeMap.get(conn.from);
      const nodeB = nodeMap.get(conn.to);
      if (nodeA && nodeB) {
        dashboard.connectNodes(nodeA, nodeB);
      } else {
        console.warn(`Connection failed: ${conn.from} -> ${conn.to}`);
      }
    }

    // Setup genesis transaction
    if (config.genesis) {
      setupGenesis(config.genesis, nodeMap, dashboard);
    }

    return nodeMap;
  };

  /**
   * Setup genesis transaction
   */
  const setupGenesis = (genesisConfig: any, nodeMap: Map<string, any>, dashboard: any) => {
    const genesisAcc = SmlCommon.generateKeyPair(genesisConfig.privateKey);
    const recipientNode = nodeMap.get(genesisConfig.recipient);

    if (!recipientNode) {
      console.warn(`Genesis recipient not found: ${genesisConfig.recipient}`);
      return;
    }

    setTimeout(() => {
      dashboard.orderTransaction(
        SmlCommon.HexToBase58(genesisAcc.getPublic(true, 'hex')),
        recipientNode.systemNode.address,
        genesisConfig.amount,
        genesisAcc,
        recipientNode
      );
    }, 1000);
  };

  return {
    initializeScene,
  };
};
