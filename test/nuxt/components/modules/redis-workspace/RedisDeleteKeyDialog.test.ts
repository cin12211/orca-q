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
        AlertDialogAction: {
          props: ['disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
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
