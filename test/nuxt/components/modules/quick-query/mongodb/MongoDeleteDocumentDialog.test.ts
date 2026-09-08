import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoDeleteDocumentDialog from '~/components/modules/quick-query/mongodb/components/MongoDeleteDocumentDialog.vue';

const mountDialog = (props: Record<string, unknown>) =>
  mount(MongoDeleteDocumentDialog, {
    props: { open: true, docId: 'doc-123', ...props },
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
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        Button: {
          props: ['disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('MongoDeleteDocumentDialog', () => {
  it('displays document id and warning', () => {
    const wrapper = mountDialog({ docId: 'doc-456' });

    expect(wrapper.text()).toContain('doc-456');
    expect(wrapper.text()).toContain('Delete Document');
    expect(wrapper.text()).toContain('This action cannot be undone');
  });

  it('emits confirm when Delete button is clicked', async () => {
    const wrapper = mountDialog({ docId: 'doc-456' });

    const deleteBtn = wrapper.find(
      '[data-testid="btn-confirm-delete-document"]'
    );
    expect(deleteBtn.exists()).toBe(true);

    await deleteBtn.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('emits cancel when Cancel button is clicked', async () => {
    const wrapper = mountDialog({ docId: 'doc-456' });

    const cancelBtn = wrapper.find('button');
    await cancelBtn.trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('disables buttons when loading is true', () => {
    const wrapper = mountDialog({ docId: 'doc-456', loading: true });

    const buttons = wrapper.findAll('button');
    for (const btn of buttons) {
      expect(btn.attributes('disabled')).toBeDefined();
    }
  });
});
