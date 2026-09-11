import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoInsertModal from '~/components/modules/quick-query/mongodb/components/MongoInsertModal.vue';

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(MongoInsertModal, {
    props: {
      open: true,
      databaseName: 'shop',
      collectionName: 'users',
      connection: { id: 'c1', family: 'mongodb', name: 'Mongo' } as any,
      ...props,
    },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /></div>' },
        DialogContent: { template: '<div><slot /></div>' },
        DialogHeader: { template: '<div><slot /></div>' },
        DialogTitle: { template: '<div><slot /></div>' },
        DialogFooter: { template: '<div><slot /></div>' },
      },
    },
  });

describe('MongoInsertModal', () => {
  it('renders tabs for Insert Document and Import File and title', () => {
    const wrapper = mountModal();

    expect(wrapper.text()).toContain('Insert Document');
    expect(wrapper.text()).toContain('Import JSON or CSV file');
  });

  it('initializes document editor with EJSON ObjectId template', () => {
    const wrapper = mountModal();

    const editor = wrapper.findComponent({ name: 'BaseCodeEditor' });
    expect(editor.exists()).toBe(true);
    expect(editor.props('modelValue')).toContain('"$oid":');
  });
});
