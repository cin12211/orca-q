import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RedisDeleteKeyDialog from '~/components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue';

const mountDialog = (props: Record<string, unknown>) =>
  mount(RedisDeleteKeyDialog, {
    props: { open: true, mode: 'key', ...props },
    global: {
      stubs: {
        AlertDialog: { template: '<div><slot /></div>' },
        AlertDialogContent: { template: '<div><slot /></div>' },
        AlertDialogHeader: { template: '<div><slot /></div>' },
        AlertDialogTitle: { template: '<div><slot /></div>' },
        AlertDialogDescription: { template: '<div><slot /></div>' },
        AlertDialogFooter: { template: '<div><slot /></div>' },
        AlertDialogCancel: {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>',
        },
        Button: {
          props: ['disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        LoadingOverlay: { template: '<div />' },
        Checkbox: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input type="checkbox" :checked="modelValue === true" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
      },
    },
  });

describe('RedisDeleteKeyDialog', () => {
  it('shows the single key name in key mode', () => {
    const wrapper = mountDialog({ mode: 'key', targetKey: 'orders:1' });

    expect(wrapper.text()).toContain('orders:1');
  });

  it('shows every key and the count in group mode', () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2', 'orders:3'],
    });

    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('orders:1');
    expect(wrapper.text()).toContain('orders:2');
    expect(wrapper.text()).toContain('orders:3');
  });

  it('emits confirm when the destructive action is clicked', async () => {
    const wrapper = mountDialog({ mode: 'key', targetKey: 'orders:1' });

    await wrapper.find('button:last-of-type').trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('disables the confirm action while loading', () => {
    const wrapper = mountDialog({
      mode: 'key',
      targetKey: 'orders:1',
      loading: true,
    });

    const actionButtons = wrapper.findAll('button');
    const confirmButton = actionButtons[actionButtons.length - 1];

    expect(confirmButton?.attributes('disabled')).toBeDefined();
  });

  it('shows a "Deleting..." label and disables Cancel while the delete is in flight', () => {
    const wrapper = mountDialog({
      mode: 'key',
      targetKey: 'orders:1',
      loading: true,
    });

    const buttons = wrapper.findAll('button');
    const confirmButton = buttons[buttons.length - 1];
    const cancelButton = buttons[0];

    expect(confirmButton?.text()).toContain('Deleting...');
    expect(cancelButton?.attributes('disabled')).toBeDefined();
  });

  it('shows the plain Delete label and an enabled Cancel when not loading', () => {
    const wrapper = mountDialog({ mode: 'key', targetKey: 'orders:1' });

    const buttons = wrapper.findAll('button');
    const confirmButton = buttons[buttons.length - 1];
    const cancelButton = buttons[0];

    expect(confirmButton?.text().trim()).toBe('Delete');
    expect(cancelButton?.attributes('disabled')).toBeUndefined();
  });

  it('shows a loading state and hides the key list while the group preview is still fetching', () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: [],
      previewLoading: true,
    });

    expect(wrapper.text()).toContain('Counting keys');
    expect(wrapper.find('ul').exists()).toBe(false);
  });

  it('disables the confirm action while the group preview is loading', () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: [],
      previewLoading: true,
    });

    const actionButtons = wrapper.findAll('button');
    const confirmButton = actionButtons[actionButtons.length - 1];

    expect(confirmButton?.attributes('disabled')).toBeDefined();
  });

  it('shows the resolved key list once preview loading finishes', () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2'],
      previewLoading: false,
    });

    expect(wrapper.text()).not.toContain('Counting keys');
    expect(wrapper.find('ul').exists()).toBe(true);
    expect(wrapper.text()).toContain('orders:1');
  });
});

describe('RedisDeleteKeyDialog key selection', () => {
  it('defaults every key to checked and confirms with the full list', async () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2', 'orders:3'],
    });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // one "select all" checkbox + one per key
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach(checkbox => {
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });

    await wrapper.find('button:last-of-type').trigger('click');

    expect(wrapper.emitted('confirm')?.[0]).toEqual([
      ['orders:1', 'orders:2', 'orders:3'],
    ]);
  });

  it('excludes unchecked keys from the confirm payload (N keys, M unchecked -> N-M)', async () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2', 'orders:3'],
    });

    const keyCheckboxes = wrapper.findAll('input[type="checkbox"]').slice(1);
    await keyCheckboxes[1]?.setValue(false);

    await wrapper.find('button:last-of-type').trigger('click');

    expect(wrapper.emitted('confirm')?.[0]).toEqual([['orders:1', 'orders:3']]);
  });

  it('unchecks every key when "select all" is toggled off, and disables confirm', async () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2'],
    });

    const selectAllCheckbox = wrapper.findAll('input[type="checkbox"]')[0];
    await selectAllCheckbox?.setValue(false);

    const keyCheckboxes = wrapper.findAll('input[type="checkbox"]').slice(1);
    keyCheckboxes.forEach(checkbox => {
      expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    });

    const buttons = wrapper.findAll('button');
    const confirmButton = buttons[buttons.length - 1];
    expect(confirmButton?.attributes('disabled')).toBeDefined();
  });

  it('resets selection to fully checked when the key list changes', async () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2'],
    });

    const keyCheckboxes = () =>
      wrapper.findAll('input[type="checkbox"]').slice(1);
    await keyCheckboxes()[0]?.setValue(false);
    expect((keyCheckboxes()[0].element as HTMLInputElement).checked).toBe(
      false
    );

    await wrapper.setProps({ targetKeys: ['inventory:1', 'inventory:2'] });

    keyCheckboxes().forEach(checkbox => {
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });
  });
});
