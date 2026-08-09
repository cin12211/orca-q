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
        AlertDialogCancel: { template: '<button><slot /></button>' },
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
});
