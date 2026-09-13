import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';
import RawQueryMongoFormatAction from '~/components/modules/raw-query/components/mongo/RawQueryMongoFormatAction.vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('RawQueryEditorFooter', () => {
  it('mounts RawQueryMongoFormatAction directly', () => {
    const wrapper = mount(RawQueryMongoFormatAction, {
      props: {
        context: {} as any,
      },
      global: {
        stubs: {
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          ContextMenuShortcut: true,
        },
      },
    });
    expect(wrapper.text()).toContain('Format script');
  });

  it('formats the full script from the MongoDB format button', async () => {
    const wrapper = mount(RawQueryEditorFooter, {
      props: {
        cursorInfo: { line: 1, column: 1 },
        executeLoading: false,
        isStreaming: false,
        explainAnalyzeOptionItems: [],
        serializeMode: 'NONE',
        isSupportFormat: true,
        databaseType: DatabaseClientType.MONGODB,
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

    await flushPromises();

    expect(wrapper.text()).toContain('Format script');
    expect(wrapper.text()).not.toContain('Format Options');

    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('onFormatCurrentStatement')).toHaveLength(1);
  });
});
