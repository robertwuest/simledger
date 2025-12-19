/**
 * Scene Configurations for Blockchain Simulator
 * Vue-specific scene definitions
 */

export interface NodeConfig {
  id: string;
  role?: 'genesis' | 'validator' | 'user';
}

export interface ConnectionConfig {
  from: string;
  to: string;
}

export interface GenesisConfig {
  privateKey: string;
  recipient: string;
  amount: number;
}

export interface SceneConfig {
  name: string;
  nodes: NodeConfig[];
  connections: ConnectionConfig[];
  genesis?: GenesisConfig;
}

/**
 * Default demo scene with 5 nodes
 */
export const defaultScene: SceneConfig = {
  name: 'Default Network',
  nodes: [
    { id: 'Bob', role: 'genesis' },
    { id: 'Alice', role: 'validator' },
    { id: 'Frank', role: 'user' },
    { id: 'Grace', role: 'user' },
    { id: 'Dave', role: 'user' },
  ],
  connections: [
    { from: 'Bob', to: 'Alice' },
    { from: 'Alice', to: 'Frank' },
    { from: 'Frank', to: 'Grace' },
    { from: 'Alice', to: 'Grace' },
  ],
  genesis: {
    privateKey: '9QpiFVXv6HNP47u2ZYGQ5anz9GigfM4JxLbvyYCfd9W',
    recipient: 'Bob',
    amount: 100
  },
};

/**
 * Simple 3-node scene
 */
export const simpleScene: SceneConfig = {
  name: 'Simple Network',
  nodes: [
    { id: 'Alice', role: 'genesis' },
    { id: 'Bob', role: 'validator' },
    { id: 'Charlie', role: 'user' },
  ],
  connections: [
    { from: 'Alice', to: 'Bob' },
    { from: 'Bob', to: 'Charlie' },
  ],
  genesis: {
    privateKey: '9QpiFVXv6HNP47u2ZYGQ5anz9GigfM4JxLbvyYCfd9W',
    recipient: 'Alice',
    amount: 50
  },
};

/**
 * Available scene presets
 */
export const scenes = {
  default: defaultScene,
  simple: simpleScene,
} as const;
