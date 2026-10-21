import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, h, type VNode } from 'vue';
import { describe, expect, it } from 'vitest';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

const baseProps = {
  cursorInfo: { line: 1, column: 1 },
  executeLoading: false,
  isStreaming: false,
  isSupportFormat: true,
  isSupportVariable: true,
};

// Tooltips inside the component need a provider, which the app shell supplies.
const mountWithProvider = (
  props: Record<string, unknown>,
  slots: Record<string, () => VNode> = {}
) =>
  mountSuspended(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(RawQueryEditorFooter, props, slots)),
    })
  );

describe('RawQueryEditorFooter', () => {
  it('renders engine-contributed controls in the extra slot', async () => {
    const wrapper = await mountWithProvider(baseProps, {
      extra: () => h('button', { 'data-testid': 'engine-action' }, 'Explain'),
    });

    expect(wrapper.find('[data-testid="engine-action"]').exists()).toBe(true);
  });

  it('does not render EXPLAIN controls of its own', async () => {
    // Legacy engine attrs: the old footer read these as props and rendered
    // its own EXPLAIN button; the slot-based footer must ignore them.
    const wrapper = await mountWithProvider({
      ...baseProps,
      isExplainSupported: true,
      explainAnalyzeOptionItems: [],
      serializeMode: 'NONE',
    });

    expect(wrapper.text()).not.toContain('Explain');
  });
});
