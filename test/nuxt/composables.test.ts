import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { provideNetwork, useNetwork, type NetworkStore } from '~/composables/useNetwork';
import { useAssetUrl } from '~/composables/useAssetUrl';
import PaneHeader from '~/components/PaneHeader.vue';

describe('useNetwork', () => {
  it('throws without a provided store', async () => {
    const Consumer = defineComponent({ setup: () => { useNetwork(); return () => h('div'); } });
    await expect(mountSuspended(Consumer)).rejects.toThrow('without a provided network store');
  });

  it('shares the provided store with descendants', async () => {
    let provided: NetworkStore | undefined;
    let injected: NetworkStore | undefined;
    const Child = defineComponent({ setup: () => { injected = useNetwork(); return () => h('span'); } });
    const Parent = defineComponent({ setup: () => { provided = provideNetwork(); return () => h(Child); } });
    await mountSuspended(Parent);
    expect(injected).toBeDefined();
    expect(injected).toBe(provided);
    provided!.dispose();
  });
});

describe('useAssetUrl', () => {
  it('resolves public assets against the app base URL', async () => {
    let url = '';
    const Consumer = defineComponent({ setup: () => { url = useAssetUrl()('/img/icons/block.svg'); return () => h('div'); } });
    await mountSuspended(Consumer);
    expect(url).toBe('/img/icons/block.svg');
  });
});

describe('PaneHeader', () => {
  it('renders the title and actions', async () => {
    const wrapper = await mountSuspended(PaneHeader, {
      props: { title: 'Console' },
      slots: { actions: () => h('button', 'Clear') },
    });
    expect(wrapper.find('h2').text()).toBe('Console');
    expect(wrapper.find('.sml-pane-header__actions button').text()).toBe('Clear');
  });
});
