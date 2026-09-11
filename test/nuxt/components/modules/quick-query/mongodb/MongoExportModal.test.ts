import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoExportModal from '~/components/modules/quick-query/mongodb/components/MongoExportModal.vue';

describe('MongoExportModal', () => {
  it('shows query preview when exportScope is current', () => {
    const wrapper = mount(MongoExportModal, {
      props: {
        open: true,
        exportScope: 'current',
        databaseName: 'shop',
        collectionName: 'roles',
        activeFilterPayload: { name: 'admin' },
      },
    });

    expect(wrapper.text()).toContain('Export results from the query below');
    expect(wrapper.text()).toContain("db.getCollection('roles').find(");
  });

  it('hides query preview when exportScope is full', () => {
    const wrapper = mount(MongoExportModal, {
      props: {
        open: true,
        exportScope: 'full',
        databaseName: 'shop',
        collectionName: 'roles',
      },
    });

    expect(wrapper.text()).not.toContain('Export results from the query below');
  });

  it('shows Advanced JSON Format with 3 options when JSON is selected', () => {
    const wrapper = mount(MongoExportModal, {
      props: {
        open: true,
        exportScope: 'current',
        databaseName: 'shop',
        collectionName: 'roles',
      },
    });

    expect(wrapper.text()).toContain('Default Extended JSON');
    expect(wrapper.text()).toContain('Relaxed Extended JSON');
    expect(wrapper.text()).toContain('Canonical Extended JSON');
  });
});
