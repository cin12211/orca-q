import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';
import RawQueryMongoFormatAction from '~/components/modules/raw-query/components/mongo/RawQueryMongoFormatAction.vue';
import {
  type RawQueryEditor,
  RAW_QUERY_CONTEXT_KEY,
} from '~/components/modules/raw-query/hooks';
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

  it('formats the full script from the MongoDB format button via context editor', async () => {
    const onHandleFormatCurrentStatement = vi.fn();
    const fakeEditor = {
      cursorInfo: ref({ line: 1, column: 1 }),
      queryProcessState: ref({ executeLoading: false, isStreaming: false }),
      explainAnalyzeOptionItems: [],
      serializeMode: ref('NONE' as const),
      onHandleFormatCurrentStatement,
      onHandleFormatCode: vi.fn(),
      onExplainAnalyzeCurrent: vi.fn(),
      toggleExplainOption: vi.fn(),
      setSerializeMode: vi.fn(),
      onExecuteCurrent: vi.fn(),
      cancelStreamingQuery: vi.fn(),
    } as unknown as RawQueryEditor;

    const fakeContext = {
      databaseType: computed(() => DatabaseClientType.MONGODB),
      rawQueryEditor: fakeEditor,
    } as any;

    const wrapper = mount(RawQueryEditorFooter, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: fakeContext,
        },
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
    expect(onHandleFormatCurrentStatement).toHaveBeenCalledTimes(1);
  });

  it('delegates actions and state directly to context rawQueryEditor', async () => {
    const onHandleFormatCurrentStatement = vi.fn();
    const fakeEditor = {
      cursorInfo: ref({ line: 5, column: 10 }),
      queryProcessState: ref({ executeLoading: false, isStreaming: false }),
      explainAnalyzeOptionItems: [],
      serializeMode: ref('NONE' as const),
      onHandleFormatCurrentStatement,
      onHandleFormatCode: vi.fn(),
      onExplainAnalyzeCurrent: vi.fn(),
      toggleExplainOption: vi.fn(),
      setSerializeMode: vi.fn(),
      onExecuteCurrent: vi.fn(),
      cancelStreamingQuery: vi.fn(),
    } as unknown as RawQueryEditor;

    const fakeContext = {
      databaseType: computed(() => DatabaseClientType.MONGODB),
      rawQueryEditor: fakeEditor,
    } as any;

    const wrapper = mount(RawQueryEditorFooter, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: fakeContext,
        },
        stubs: {
          Button: { template: '<button><slot /></button>' },
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

    const formatButton = wrapper
      .findAll('button')
      .find(btn => btn.text().includes('Format script'));
    expect(formatButton).toBeDefined();
    await formatButton!.trigger('click');
    expect(onHandleFormatCurrentStatement).toHaveBeenCalledTimes(1);
  });
});
