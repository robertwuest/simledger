import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import Dashboard from '~/components/Dashboard.vue';
import GraphViewer from '~/components/graph/GraphViewer.vue';
import NodeExplorer from '~/components/NodeExplorer.vue';
import NodeEditor from '~/components/NodeEditor.vue';
import LogConsole from '~/components/LogConsole.vue';
import { createTestNetwork, mountWithNetwork } from '../support/network';

describe('Dashboard', () => {
  const network = createTestNetwork(['Alice', 'Bob'], [['Alice', 'Bob']]);

  afterEach(() => network.dispose());

  it('lays out graph, explorer, console and editor panes', async () => {
    const wrapper = await mountWithNetwork(Dashboard, network, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.findAll('.sml-pane-header__title').map(title => title.text()))
      .toEqual(['Graph Viewer', 'Explorer', 'Console', 'Editor']);
    [GraphViewer, NodeExplorer, LogConsole, NodeEditor].forEach(component => {
      expect(wrapper.findComponent(component).exists()).toBe(true);
    });
    expect(wrapper.findAll('[data-testid="network-node"]')).toHaveLength(2);
  });
});
