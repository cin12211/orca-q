import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';

describe('RawQueryEditorFooter', () => {
  it('formats the full script from the MongoDB format button', async () => {
    const wrapper = mount(RawQueryEditorFooter, {
      props: {
        cursorInfo: { line: 1, column: 1 },
        executeLoading: false,
        isStreaming: false,
        explainAnalyzeOptionItems: [],
        serializeMode: 'NONE',
        isSupportFormat: true,
        isMongoConnection: true,
      },
      global: {
        stubs: {
          Button: {
            template: '<button><slot /></button>',
          },
          ContextMenuShortcut: true,
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuContent: true,
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Format script');
    expect(wrapper.text()).not.toContain('Format Options');

    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('onFormatCurrentStatement')).toHaveLength(1);
  });
});
