import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TreeRow from '~/components/base/tree-folder/TreeRow.vue';
import type { FileNode } from '~/components/base/tree-folder/types';

const folderNode: FileNode = {
  id: 'folder-1',
  parentId: null,
  name: 'src',
  type: 'folder',
  depth: 1,
  children: ['file-1'],
};

const fileNode: FileNode = {
  id: 'file-1',
  parentId: 'folder-1',
  name: 'index.ts',
  type: 'file',
  depth: 2,
};

const mountRow = (props: Partial<InstanceType<typeof TreeRow>['$props']>) =>
  mount(TreeRow, {
    props: {
      node: fileNode,
      isSelected: false,
      isExpanded: false,
      isFocused: false,
      ...props,
    },
    global: {
      stubs: {
        Icon: defineComponent({
          name: 'Icon',
          props: {
            name: {
              type: String,
              default: '',
            },
          },
          setup(iconProps) {
            return () => h('i', { 'data-icon': iconProps.name });
          },
        }),
      },
    },
  });

describe('TreeRow', () => {
  it('renders node name', () => {
    const wrapper = mountRow({ node: fileNode });

    expect(wrapper.text()).toContain('index.ts');
  });

  it('renders custom row actions through the actions slot', () => {
    const wrapper = mount(TreeRow, {
      props: {
        node: fileNode,
        isSelected: false,
        isExpanded: false,
        isFocused: false,
      },
      slots: {
        actions: () => h('button', { class: 'test-action' }, 'Inspect'),
      },
      global: {
        stubs: {
          Icon: defineComponent({
            name: 'Icon',
            props: {
              name: {
                type: String,
                default: '',
              },
            },
            setup(iconProps) {
              return () => h('i', { 'data-icon': iconProps.name });
            },
          }),
        },
      },
    });

    expect(wrapper.find('.test-action').text()).toBe('Inspect');
  });

  it('renders chevron button for folder nodes', () => {
    const wrapper = mountRow({ node: folderNode });

    expect(wrapper.find('.tree-row__chevron').exists()).toBe(true);
  });

  it('renders spacer instead of chevron for file nodes', () => {
    const wrapper = mountRow({ node: fileNode });

    expect(wrapper.find('.tree-row__spacer').exists()).toBe(true);
  });

  it('emits click and dblclick events', async () => {
    const wrapper = mountRow({ node: fileNode });
    const row = wrapper.find('.tree-row');

    await row.trigger('click');
    await row.trigger('dblclick');

    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(wrapper.emitted('dblclick')).toHaveLength(1);
  });

  it('emits toggle when chevron is clicked', async () => {
    const wrapper = mountRow({ node: folderNode });

    await wrapper.find('.tree-row__chevron').trigger('click');

    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });

  it('applies focused class when row is focused', () => {
    const wrapper = mountRow({ node: fileNode, isFocused: true });

    expect(wrapper.find('.tree-row').classes()).toContain('tree-row--focused');
  });

  it('uses drag-and-drop only when allowed and not editing', () => {
    const wrapperEnabled = mountRow({
      node: fileNode,
      allowDragAndDrop: true,
      isEditing: false,
    });
    const wrapperDisabled = mountRow({
      node: fileNode,
      allowDragAndDrop: false,
      isEditing: false,
    });
    const wrapperEditing = mountRow({
      node: fileNode,
      allowDragAndDrop: true,
      isEditing: true,
    });

    expect(wrapperEnabled.find('.tree-row').attributes('draggable')).toBe(
      'true'
    );
    expect(wrapperDisabled.find('.tree-row').attributes('draggable')).toBe(
      'false'
    );
    expect(wrapperEditing.find('.tree-row').attributes('draggable')).toBe(
      'false'
    );
  });

  it('applies row indentation and height from props', () => {
    const wrapper = mountRow({
      node: fileNode,
      itemHeight: 30,
      indentSize: 16,
      baseIndent: 6,
    });

    const style = wrapper.find('.tree-row').attributes('style');

    expect(style).toContain('height: 30px');
    expect(style).toContain('padding-left: 38px');
  });

  it('shows input and emits editing-change in editing mode', async () => {
    const wrapper = mountRow({ node: fileNode, isEditing: true });
    const input = wrapper.find('input');

    await input.setValue('new-name.ts');

    expect(input.exists()).toBe(true);
    expect(wrapper.emitted('editingChange')).toHaveLength(1);
  });

  it('emits rename on Enter for changed value', async () => {
    const wrapper = mountRow({ node: fileNode, isEditing: true });
    const input = wrapper.find('input');

    await input.setValue('renamed.ts');
    await input.trigger('keydown.enter');

    expect(wrapper.emitted('rename')?.[0]).toEqual(['renamed.ts']);
  });

  it('emits cancelRename on Escape', async () => {
    const wrapper = mountRow({ node: fileNode, isEditing: true });

    await wrapper.find('input').trigger('keydown.esc');

    expect(wrapper.emitted('cancelRename')).toHaveLength(1);
  });

  it('cancels rename on blur when renameError is present', async () => {
    const wrapper = mountRow({
      node: fileNode,
      isEditing: true,
      renameError: 'Name exists',
    });

    await wrapper.find('input').trigger('blur');

    expect(wrapper.emitted('cancelRename')).toHaveLength(1);
  });
});
