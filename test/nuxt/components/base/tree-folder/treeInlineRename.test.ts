import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import TreeRow from '~/components/base/tree-folder/TreeRow.vue';
import { useTreeKeyboardNav } from '~/components/base/tree-folder/hooks/useTreeKeyboardNav';
import { useTreeRename } from '~/components/base/tree-folder/hooks/useTreeRename';
import type { FileNode } from '~/components/base/tree-folder/types';

const fileNode: FileNode = {
  id: 'file-1',
  parentId: null,
  name: 'query.sql',
  type: 'file',
  depth: 0,
};

const IconStub = defineComponent({
  name: 'Icon',
  props: { name: { type: String, default: '' } },
  setup(props) {
    return () => h('i', { 'data-icon': props.name });
  },
});

const makeKeyboardNav = () => {
  const emit = vi.fn();
  const { handleKeyDown } = useTreeKeyboardNav(emit, {
    nodes: ref({ [fileNode.id]: fileNode }),
    expandedIds: ref(new Set<string>()),
    visibleNodeIds: computed(() => [fileNode.id]),
    focusedId: ref<string | null>(fileNode.id),
    toggleExpansion: vi.fn(),
    scrollToItem: vi.fn(),
  });
  return { emit, handleKeyDown };
};

const keydownFrom = (target: EventTarget, key: string) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  Object.defineProperty(event, 'target', { value: target });
  return event;
};

describe('tree keyboard navigation and inline rename input', () => {
  it.each(['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp'])(
    'leaves %s to the rename input',
    key => {
      const { emit, handleKeyDown } = makeKeyboardNav();
      const event = keydownFrom(document.createElement('input'), key);

      handleKeyDown(event);

      expect(event.defaultPrevented).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    }
  );

  it('still deletes the focused node when Backspace comes from the tree', () => {
    const { emit, handleKeyDown } = makeKeyboardNav();
    const event = keydownFrom(document.createElement('div'), 'Backspace');

    handleKeyDown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(emit).toHaveBeenCalledWith('delete', fileNode.id, event);
  });

  it('focuses the input when a row mounts already in editing mode', async () => {
    const wrapper = mount(TreeRow, {
      attachTo: document.body,
      props: {
        node: fileNode,
        isSelected: false,
        isExpanded: false,
        isFocused: false,
        isEditing: true,
      },
      global: { stubs: { Icon: IconStub } },
    });

    await nextTick();
    await nextTick();

    const input = wrapper.find('input').element as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('query.sql');

    wrapper.unmount();
  });
});

describe('useTreeRename while typing', () => {
  const setup = (
    validate = vi.fn((_id: string, name: string) =>
      name.trim() === 'taken.sql' ? 'Name already exists' : (true as const)
    )
  ) => {
    const emit = vi.fn();
    const rename = useTreeRename(
      {
        validateRename: validate,
        itemHeight: 24,
        indentSize: 20,
        baseIndent: 8,
      },
      emit,
      {
        nodes: ref({ [fileNode.id]: fileNode }),
        visibleNodeIds: computed(() => [fileNode.id]),
      }
    );
    return { rename, validate };
  };

  it('does not flag an empty name while the user is typing', () => {
    const { rename, validate } = setup();

    rename.handleEditingChange(fileNode.id, '');
    rename.handleEditingChange(fileNode.id, '   ');

    expect(validate).not.toHaveBeenCalled();
    expect(rename.renameErrors.value[fileNode.id]).toBeUndefined();
  });

  it('keeps the same errors object while the message does not change', () => {
    const { rename } = setup();

    rename.handleEditingChange(fileNode.id, 'taken.sql');
    const firstErrors = rename.renameErrors.value;
    rename.handleEditingChange(fileNode.id, 'taken.sql ');

    expect(rename.renameErrors.value).toBe(firstErrors);
    expect(firstErrors[fileNode.id]).toBe('Name already exists');

    rename.handleEditingChange(fileNode.id, 'free.sql');
    expect(rename.renameErrors.value[fileNode.id]).toBeUndefined();
  });
});
