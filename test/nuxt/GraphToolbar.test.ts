import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import GraphToolbar from '~/components/graph/GraphToolbar.vue';

describe('GraphToolbar', () => {
  it.each([
    ['toolbar-add-node', 'add-node'],
    ['toolbar-layout', 'layout'],
    ['toolbar-fit', 'fit'],
    ['toolbar-simulation', 'toggle-simulation'],
  ])('%s emits %s', async (testId, event) => {
    const wrapper = await mountSuspended(GraphToolbar, { props: { running: true } });
    await wrapper.find(`[data-testid="${testId}"]`).trigger('click');
    expect(wrapper.emitted(event)).toHaveLength(1);
  });

  it('reflects the simulation state', async () => {
    const wrapper = await mountSuspended(GraphToolbar, { props: { running: true } });
    expect(wrapper.find('[data-testid="toolbar-simulation"]').attributes('aria-label')).toBe('Pause simulation');
    await wrapper.setProps({ running: false });
    expect(wrapper.find('[data-testid="toolbar-simulation"]').attributes('aria-label')).toBe('Resume simulation');
    expect(wrapper.find('[data-testid="toolbar-simulation"]').attributes('aria-pressed')).toBe('true');
  });
});
