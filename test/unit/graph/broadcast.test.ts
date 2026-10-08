import { describe, expect, it } from 'vitest';
import { edgeId, resolveBroadcastTargets } from '~/utils/graph/broadcast';

describe('edgeId', () => {
  it('is independent of the argument order', () => {
    expect(edgeId('Bob', 'Alice')).toBe('Alice--Bob');
    expect(edgeId('Alice', 'Bob')).toBe('Alice--Bob');
  });

  it('distinguishes different connections', () => {
    expect(edgeId('Alice', 'Frank')).not.toBe(edgeId('Alice', 'Grace'));
  });
});

describe('resolveBroadcastTargets', () => {
  const neighbors = ['Bob', 'Frank', 'Grace'];

  it('sends along every edge when the sender originated the message', () => {
    expect(resolveBroadcastTargets('Alice', 'Alice', neighbors)).toEqual(['Bob', 'Frank', 'Grace']);
  });

  it('skips the edge back to the referrer when relaying', () => {
    expect(resolveBroadcastTargets('Alice', 'Bob', neighbors)).toEqual(['Frank', 'Grace']);
  });

  it('relays to every neighbour when the referrer is not adjacent', () => {
    expect(resolveBroadcastTargets('Alice', 'Dave', neighbors)).toEqual(neighbors);
  });

  it('returns nothing for an isolated node', () => {
    expect(resolveBroadcastTargets('Dave', 'Dave', [])).toEqual([]);
  });

  it('does not mutate the neighbour list', () => {
    const list = ['Bob'];
    const result = resolveBroadcastTargets('Alice', 'Alice', list);
    result.push('X');
    expect(list).toEqual(['Bob']);
  });
});
