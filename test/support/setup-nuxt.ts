/**
 * Global setup for component tests running in the Nuxt environment
 */
import { config } from '@vue/test-utils';
import { defineComponent } from 'vue';

// UTooltip requires the TooltipProvider rendered by <UApp>; render its trigger only
config.global.stubs.UTooltip = defineComponent({
  name: 'UTooltip',
  setup: (_, { slots }) => () => slots.default?.(),
});
