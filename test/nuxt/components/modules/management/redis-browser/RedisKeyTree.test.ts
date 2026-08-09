import { defineComponent, h, KeepAlive, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import RedisKeyTree from '~/components/modules/management/redis-browser/components/RedisKeyTree.vue';
import { useRedisTreeData } from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';

const redisKeys = [
  {
    key: 'inventory:1',
    type: 'hash',
    ttl: -1,
    memoryUsage: 512,
    memoryUsageHuman: '512 B',
  },
  {
    key: 'orders:1',
    type: 'string',
    ttl: 120,
    memoryUsage: 1024,
    memoryUsageHuman: '1.0 KB',
  },
  {
    key: 'orders:2',
    type: 'hash',
    ttl: -1,
    memoryUsage: 256,
    memoryUsageHuman: '256 B',
  },
];

describe('useRedisTreeData', () => {
  it('groups redis keys by prefix into FileTree nodes', () => {
    const { fileTreeData, defaultFolderOpenIds } = useRedisTreeData(
      ref(redisKeys),
      ref('')
    );

    expect(fileTreeData.value['redis-group:orders']).toMatchObject({
      name: 'orders',
      type: 'folder',
      parentId: null,
      children: ['redis-key:orders:1', 'redis-key:orders:2'],
    });
    expect(fileTreeData.value['redis-key:orders:1']).toMatchObject({
      name: '1',
      type: 'file',
      parentId: 'redis-group:orders',
      data: {
        kind: 'key',
        memoryUsageHuman: '1.0 KB',
        ttl: 120,
      },
    });
    expect(fileTreeData.value['redis-key:inventory:1']).toMatchObject({
      name: '1',
      type: 'file',
      parentId: 'redis-group:inventory',
      data: {
        kind: 'key',
        memoryUsageHuman: '512 B',
        ttl: -1,
      },
    });
    expect(fileTreeData.value['redis-group:orders']).toMatchObject({
      data: {
        kind: 'group',
        keyCount: 2,
        memoryUsage: 1280,
      },
    });
    expect(defaultFolderOpenIds.value).toEqual([
      'redis-group:inventory',
      'redis-group:orders',
    ]);
  });

  it('filters key tree data with client-side search while preserving ancestors', () => {
    const { fileTreeData } = useRedisTreeData(ref(redisKeys), ref('orders:2'));

    expect(Object.keys(fileTreeData.value)).toEqual([
      'redis-group:orders',
      'redis-key:orders:2',
    ]);
  });

  it('renders full keys in list mode and emits the selected key', async () => {
    const wrapper = mount(RedisKeyTree, {
      props: {
        keys: redisKeys,
        viewMode: 'list',
      },
    });

    const items = wrapper.findAll('button');

    expect(wrapper.text()).toContain('inventory:1');
    expect(wrapper.text()).toContain('orders:1');

    await items[0]?.trigger('click');

    expect(wrapper.emitted('select')).toEqual([['inventory:1']]);
  });
});

const createFileTreeStub = () => {
  const focusItem = vi.fn();
  const clearSelection = vi.fn();

  const stub = defineComponent({
    name: 'FileTree',
    props: {
      initialData: { type: Object, default: () => ({}) },
      initExpandedIds: { type: Array, default: () => [] },
      storageKey: { type: String, default: '' },
      allowDragAndDrop: { type: Boolean, default: false },
      delayFocus: { type: Number, default: 0 },
    },
    emits: ['click', 'contextmenu', 'delete'],
    setup(_, { expose }) {
      expose({
        focusItem,
        clearSelection,
        collapseAll: vi.fn(),
        expandAll: vi.fn(),
        isExpandedAll: false,
      });
    },
    render: () => h('div', { class: 'filetree-stub' }),
  });

  return { stub, focusItem, clearSelection };
};

describe('RedisKeyTree focus behavior', () => {
  it('does not re-focus the row on a direct click (already highlighted by FileTree itself)', async () => {
    const { stub, focusItem } = createFileTreeStub();
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'list' },
      global: { stubs: { FileTree: stub } },
    });

    await wrapper.vm.$nextTick();
    focusItem.mockClear();

    const fileTreeStub = wrapper.findComponent(stub);
    await fileTreeStub.vm.$emit('click', 'redis-key:inventory:1');
    await wrapper.setProps({ selectedKey: 'inventory:1' });
    await wrapper.vm.$nextTick();

    expect(focusItem).not.toHaveBeenCalled();
  });

  it('focuses the selected key when the component is (re)activated with a key already selected', async () => {
    const { stub, focusItem } = createFileTreeStub();

    const KeepAliveHost = defineComponent({
      setup() {
        const show = ref(true);
        return { show };
      },
      render() {
        return h(KeepAlive, null, {
          default: () =>
            this.show
              ? h(RedisKeyTree, {
                  keys: redisKeys,
                  selectedKey: 'inventory:1',
                  viewMode: 'list',
                })
              : null,
        });
      },
    });

    const wrapper = mount(KeepAliveHost, {
      global: { stubs: { FileTree: stub } },
    });

    await wrapper.vm.$nextTick();
    focusItem.mockClear();

    (wrapper.vm as any).show = false;
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).show = true;
    await wrapper.vm.$nextTick();

    expect(focusItem).toHaveBeenCalledWith('redis-key:inventory:1');
  });
});

const createBaseContextMenuStub = () => {
  let lastItems: any[] = [];

  const stub = defineComponent({
    name: 'BaseContextMenu',
    props: {
      contextMenuItems: { type: Array, default: () => [] },
    },
    emits: ['onClearContextMenu'],
    setup(props, { slots }) {
      return () => {
        lastItems = props.contextMenuItems as any[];
        return h('div', { class: 'context-menu-stub' }, slots.default?.());
      };
    },
  });

  return { stub, getLastItems: () => lastItems };
};

describe('RedisKeyTree delete', () => {
  it('emits delete-key with immediate:false on a plain Delete keypress for a focused key', async () => {
    const { stub } = createFileTreeStub();
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'list' },
      global: { stubs: { FileTree: stub } },
    });

    await wrapper.vm.$nextTick();
    const fileTreeStub = wrapper.findComponent(stub);
    await fileTreeStub.vm.$emit('delete', 'redis-key:inventory:1', {
      metaKey: false,
      ctrlKey: false,
    });

    expect(wrapper.emitted('delete-key')?.[0]).toEqual([
      'inventory:1',
      { immediate: false },
    ]);
  });

  it('emits delete-key with immediate:true when Cmd/Ctrl+Delete is pressed on a focused key', async () => {
    const { stub } = createFileTreeStub();
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'list' },
      global: { stubs: { FileTree: stub } },
    });

    await wrapper.vm.$nextTick();
    const fileTreeStub = wrapper.findComponent(stub);
    await fileTreeStub.vm.$emit('delete', 'redis-key:inventory:1', {
      metaKey: true,
      ctrlKey: false,
    });

    expect(wrapper.emitted('delete-key')?.[0]).toEqual([
      'inventory:1',
      { immediate: true },
    ]);
  });

  it('emits delete-group with the group prefix when a folder node is deleted via keyboard', async () => {
    const { stub } = createFileTreeStub();
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'tree' },
      global: { stubs: { FileTree: stub } },
    });

    await wrapper.vm.$nextTick();
    const fileTreeStub = wrapper.findComponent(stub);
    await fileTreeStub.vm.$emit('delete', 'redis-group:orders', {
      metaKey: false,
      ctrlKey: false,
    });

    expect(wrapper.emitted('delete-group')?.[0]).toEqual(['orders']);
  });

  it('resolves a right-clicked key node into a Delete context menu action that emits delete-key', async () => {
    const { stub: fileTreeStub } = createFileTreeStub();
    const { stub: contextMenuStub, getLastItems } = createBaseContextMenuStub();

    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'list' },
      global: {
        stubs: { FileTree: fileTreeStub, BaseContextMenu: contextMenuStub },
      },
    });

    await wrapper.vm.$nextTick();
    const treeStub = wrapper.findComponent(fileTreeStub);
    await treeStub.vm.$emit(
      'contextmenu',
      'redis-key:inventory:1',
      new MouseEvent('contextmenu')
    );
    await wrapper.vm.$nextTick();

    const items = getLastItems();
    const deleteAction = items.find(item => item.title === 'Delete');
    deleteAction?.select?.();

    expect(wrapper.emitted('delete-key')?.[0]).toEqual([
      'inventory:1',
      { immediate: false },
    ]);
  });
});
