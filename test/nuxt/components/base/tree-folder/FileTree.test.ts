import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';

const { scrollToIndexMock } = vi.hoisted(() => ({
  scrollToIndexMock: vi.fn(),
}));

vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: (options: any) => {
    const getCount = () => {
      const value = options.count;
      return typeof value === 'function' ? value() : value;
    };

    return ref({
      scrollOffset: 0,
      scrollToIndex: scrollToIndexMock,
      scrollToOffset: vi.fn(),
      getTotalSize: () => getCount() * 24,
      getVirtualItems: () =>
        Array.from({ length: getCount() }, (_, index) => ({
          key: index,
          index,
          size: 24,
          start: index * 24,
        })),
    });
  },
}));

const treeData: Record<string, FileNode> = {
  root: {
    id: 'root',
    parentId: null,
    name: 'root',
    type: 'folder',
    depth: 0,
    children: ['src'],
  },
  src: {
    id: 'src',
    parentId: 'root',
    name: 'src',
    type: 'folder',
    depth: 1,
    children: ['index.ts'],
  },
  'index.ts': {
    id: 'index.ts',
    parentId: 'src',
    name: 'index.ts',
    type: 'file',
    depth: 2,
  },
};

const TreeRowStub = defineComponent({
  name: 'TreeRow',
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'click',
    'dblclick',
    'toggle',
    'dragstart',
    'dragover',
    'dragleave',
    'dragend',
    'drop',
    'contextmenu',
    'rename',
    'editing-change',
    'cancel-rename',
  ],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          class: 'tree-row',
          'data-node-id': (props.node as any).id,
          onClick: (event: MouseEvent) => emit('click', event),
          onDblclick: (event: MouseEvent) => emit('dblclick', event),
          onContextmenu: (event: MouseEvent) => emit('contextmenu', event),
        },
        [
          h(
            'button',
            {
              class: 'toggle-btn',
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
                emit('toggle');
              },
            },
            'toggle'
          ),
          h('span', (props.node as any).name),
        ]
      );
  },
});

const mountTree = (props?: Partial<InstanceType<typeof FileTree>['$props']>) =>
  mount(FileTree, {
    props: {
      initialData: treeData,
      delayFocus: 0,
      ...props,
    },
    global: {
      stubs: {
        Icon: true,
      },
    },
  });

describe('FileTree', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders root node from initial data', () => {
    const wrapper = mountTree();

    // Ensure onMounted data hydration has flushed
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.text()).toContain('root');
    });
  });

  it('emits select and click when clicking a row', async () => {
    const wrapper = mountTree();

    await wrapper.vm.$nextTick();

    await wrapper.find('.tree-row').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual([['root']]);
    expect(wrapper.emitted('click')?.[0]?.[0]).toBe('root');
  });

  it('expands folder when toggle is emitted', async () => {
    const wrapper = mountTree();

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('src');

    await wrapper.find('.tree-row__chevron').trigger('click');

    expect(wrapper.text()).toContain('src');
  });

  it('expandAll exposed method expands all folders', async () => {
    const wrapper = mountTree();

    await (wrapper.vm as any).expandAll();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).isExpandedAll).toBe(true);
    expect(wrapper.text()).toContain('src');
  });

  it('collapseAll exposed method collapses all folders', async () => {
    const wrapper = mountTree();

    await (wrapper.vm as any).expandAll();
    await wrapper.vm.$nextTick();

    await (wrapper.vm as any).collapseAll();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).isExpandedAll).toBe(false);
    expect(wrapper.text()).not.toContain('src');
  });

  it('focusItem warns when node id does not exist', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mountTree();

    (wrapper.vm as any).focusItem('missing-node');

    expect(warnSpy).toHaveBeenCalledWith('Node missing-node not found');
    warnSpy.mockRestore();
  });

  it('focusItem expands parent chain and emits selection', async () => {
    const wrapper = mountTree({ delayFocus: 0 });

    (wrapper.vm as any).focusItem('index.ts');
    vi.runAllTimers();
    await wrapper.vm.$nextTick();

    const selectEvents = wrapper.emitted('select') || [];
    expect(
      selectEvents.some(
        payload => JSON.stringify(payload) === JSON.stringify([['index.ts']])
      )
    ).toBe(true);
    expect(scrollToIndexMock).toHaveBeenCalled();
  });

  it('clearSelection exposed method emits empty selection', () => {
    const wrapper = mountTree();

    (wrapper.vm as any).clearSelection();

    const selectEvents = wrapper.emitted('select') || [];
    expect(
      selectEvents.some(
        payload => JSON.stringify(payload) === JSON.stringify([[]])
      )
    ).toBe(true);
  });

  it('clears selection on background click', async () => {
    const wrapper = mountTree();

    await wrapper.find('.file-tree').trigger('click');

    const selectEvents = wrapper.emitted('select') || [];
    expect(selectEvents[selectEvents.length - 1]).toEqual([[]]);
  });
});
