import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, h, type VNode } from 'vue';
import { describe, expect, it } from 'vitest';
import RawQueryEditorHeader from '~/components/modules/raw-query/components/RawQueryEditorHeader.vue';
import { RawQueryEditorLayout } from '~/components/modules/raw-query/constants';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const baseProps = {
  currentFileInfo: { id: 'f1', title: 'Query', icon: 'hugeicons:sql' },
  fileVariables: '',
  workspaceId: 'ws-1',
  selectedConnectionId: 'conn-1',
  disableConnectionSwitch: false,
  connections: [],
  codeEditorLayout: RawQueryEditorLayout.horizontal,
};

// Tooltips inside the component need a provider, which the app shell supplies.
const mountWithProvider = (
  props: Record<string, unknown>,
  slots: Record<string, () => VNode> = {}
) =>
  mountSuspended(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(RawQueryEditorHeader, props, slots)),
    })
  );

describe('RawQueryEditorHeader', () => {
  it('renders engine-contributed controls in the extra slot', async () => {
    const wrapper = await mountWithProvider(baseProps, {
      extra: () => h('div', { 'data-testid': 'engine-picker' }, 'Picker'),
    });

    expect(wrapper.find('[data-testid="engine-picker"]').exists()).toBe(true);
  });

  it('does not render a Redis database picker of its own', async () => {
    // Legacy engine attrs: the old header read these as props and rendered
    // its own Redis picker; the slot-based header must ignore them.
    const wrapper = await mountWithProvider({
      ...baseProps,
      isRedisConnection: true,
      redisDatabases: [],
    });

    expect(wrapper.find('#raw-query-redis-db-index').exists()).toBe(false);
  });
});
