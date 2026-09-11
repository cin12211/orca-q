import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoInsertModal from '~/components/modules/quick-query/mongodb/components/MongoInsertModal.vue';

describe('MongoInsertModal', () => {
  it('renders tabs for Insert Document and Import File', () => {
    const wrapper = mount(MongoInsertModal, {
      props: {
        open: true,
        databaseName: 'shop',
        collectionName: 'users',
        connection: { id: 'c1', family: 'mongodb', name: 'Mongo' } as any,
      },
    });

    expect(wrapper.text()).toContain('Insert Document');
    expect(wrapper.text()).toContain('Import JSON or CSV file');
  });

  it('initializes document editor with ObjectId template', () => {
    const wrapper = mount(MongoInsertModal, {
      props: {
        open: true,
        databaseName: 'shop',
        collectionName: 'users',
        connection: { id: 'c1', family: 'mongodb', name: 'Mongo' } as any,
      },
    });

    const editor = wrapper.findComponent({ name: 'BaseCodeEditor' });
    expect(editor.exists()).toBe(true);
    expect(editor.props('modelValue')).toContain('"_id": ObjectId(');
  });
});
