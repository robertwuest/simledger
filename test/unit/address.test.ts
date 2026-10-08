import { describe, expect, it } from 'vitest';
import { describeAddress, MINING_REWARD_ADDRESS } from '~/utils/address';

const nodes = [{ id: 'Alice', address: 'addr-alice' }, { id: 'Bob', address: 'addr-bob' }];

describe('describeAddress', () => {
  it('labels mining rewards', () => {
    expect(describeAddress(MINING_REWARD_ADDRESS, nodes, 'genesis')).toEqual({ label: '⚡ Reward', kind: 'reward' });
  });

  it('labels the genesis wallet', () => {
    expect(describeAddress('genesis', nodes, 'genesis')).toEqual({ label: '🎆 Genesis', kind: 'genesis' });
  });

  it('resolves node wallets to the node name', () => {
    expect(describeAddress('addr-bob', nodes, 'genesis')).toEqual({ label: 'Bob', kind: 'node' });
  });

  it('shortens unknown addresses', () => {
    expect(describeAddress('XYZ123456789', nodes)).toEqual({ label: 'XYZ123…', kind: 'external' });
  });
});
