/**
 * Human readable labels for ledger addresses
 */

export const MINING_REWARD_ADDRESS = '_';

export interface AddressLabel {
  label: string;
  kind: 'reward' | 'genesis' | 'node' | 'external';
}

/**
 * Describe an address for display in the explorer
 * @param address - Base58 address, or '_' for mining rewards
 * @param nodes - Known network nodes (id and wallet address)
 * @param genesisAddress - Address of the genesis wallet
 */
export function describeAddress(
  address: string,
  nodes: readonly { id: string; address: string }[],
  genesisAddress?: string,
): AddressLabel {
  if (address === MINING_REWARD_ADDRESS) {
    return { label: '⚡ Reward', kind: 'reward' };
  }
  if (genesisAddress && address === genesisAddress) {
    return { label: '🎆 Genesis', kind: 'genesis' };
  }
  const node = nodes.find(item => item.address === address);
  if (node) {
    return { label: node.id, kind: 'node' };
  }
  return { label: `${address.substring(0, 6)}…`, kind: 'external' };
}
