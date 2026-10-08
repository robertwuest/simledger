import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import NodeDot from '~/components/ledger/NodeDot.vue';
import AddressLabel from '~/components/ledger/AddressLabel.vue';
import TransactionItem from '~/components/ledger/TransactionItem.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { nodeColor } from '~/utils/graph/colors';
import { createTestNetwork, mountWithNetwork } from '../support/network';

describe('ledger components', () => {
  let network: NetworkStore;

  beforeEach(() => {
    network = createTestNetwork(['Alice', 'Bob']);
  });

  afterEach(() => network.dispose());

  describe('NodeDot', () => {
    it('uses the node color from the graph', async () => {
      const wrapper = await mountWithNetwork(NodeDot, network, { props: { nodeId: 'Bob' } });
      const expected = document.createElement('span');
      expected.style.backgroundColor = nodeColor(1);
      expect((wrapper.element as HTMLElement).style.backgroundColor).toBe(expected.style.backgroundColor);
    });
  });

  describe('AddressLabel', () => {
    const label = (address: string) => mountWithNetwork(AddressLabel, network, { props: { address } });

    it('names node wallets with their color', async () => {
      const wrapper = await label(network.getNode('Alice')!.address);
      expect(wrapper.attributes('data-kind')).toBe('node');
      expect(wrapper.text()).toBe('Alice');
      expect(wrapper.find('[data-testid="node-dot"]').exists()).toBe(true);
    });

    it('labels mining rewards and the genesis wallet', async () => {
      expect((await label('_')).text()).toBe('Mining reward');
      const genesis = await label(network.getNode('Alice')!.blockchain.genesisAddress);
      expect(genesis.attributes('data-kind')).toBe('genesis');
      expect(genesis.text()).toBe('Genesis');
    });

    it('shortens unknown addresses and keeps the full one as tooltip', async () => {
      const wrapper = await label('XYZ123456789');
      expect(wrapper.attributes('data-kind')).toBe('external');
      expect(wrapper.text()).toBe('XYZ123…');
      expect(wrapper.attributes('title')).toBe('XYZ123456789');
    });
  });

  describe('TransactionItem', () => {
    it('shows sender, recipient and amount', async () => {
      const wrapper = await mountWithNetwork(TransactionItem, network, {
        props: { transaction: { fromAddress: '_', toAddress: network.getNode('Bob')!.address, amount: 10 } },
      });
      expect(wrapper.findAll('[data-testid="address-label"]').map(l => l.text())).toEqual(['Mining reward', 'Bob']);
      expect(wrapper.find('[data-testid="transaction-amount"]').text()).toBe('10');
      expect(wrapper.text()).not.toContain('#');
    });

    it('tags the block when given', async () => {
      const wrapper = await mountWithNetwork(TransactionItem, network, {
        props: { transaction: { fromAddress: '_', toAddress: '_', amount: 1 }, block: 3 },
      });
      expect(wrapper.text()).toContain('#3');
    });
  });
});
