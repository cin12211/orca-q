import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoExportModal from '~/components/modules/quick-query/mongodb/components/MongoExportModal.vue';
import { MongoExportScope } from '~/components/modules/quick-query/mongodb/types';

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(MongoExportModal, {
    props: {
      open: true,
      exportScope: MongoExportScope.Current,
      databaseName: 'shop',
      collectionName: 'roles',
      activeFilterPayload: { name: 'admin' },
      ...props,
    },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /></div>' },
        DialogContent: { template: '<div><slot /></div>' },
        DialogHeader: { template: '<div><slot /></div>' },
        DialogTitle: { template: '<div><slot /></div>' },
        DialogFooter: { template: '<div><slot /></div>' },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipProvider: { template: '<div><slot /></div>' },
      },
    },
  });

describe('MongoExportModal', () => {
  it('shows query preview when exportScope is current', () => {
    const wrapper = mountModal({
      exportScope: MongoExportScope.Current,
      activeFilterPayload: { name: 'admin' },
    });

    expect(wrapper.text()).toContain('Export results from the query below');
    expect(wrapper.text()).toContain("db.getCollection('roles').find(");
  });

  it('hides query preview when exportScope is full/all', () => {
    const wrapper = mountModal({
      exportScope: MongoExportScope.All,
    });

    expect(wrapper.text()).not.toContain('Export results from the query below');
  });

  it('shows Advanced JSON Format with 3 options', () => {
    const wrapper = mountModal({
      exportScope: MongoExportScope.Current,
    });

    expect(wrapper.text()).toContain('Default Extended JSON');
    expect(wrapper.text()).toContain('Relaxed Extended JSON');
    expect(wrapper.text()).toContain('Canonical Extended JSON');
    expect(wrapper.text()).toContain(
      'Large numbers (>= 2^53) will change with this format'
    );
  });

  it('renders File Name template input and displays resolved preview', () => {
    const wrapper = mountModal({
      exportScope: MongoExportScope.Current,
      collectionName: 'roles',
    });

    const input = wrapper.find<HTMLInputElement>('input#export-filename');
    expect(input.exists()).toBe(true);
    expect(input.element.value).toBe('{collection}_{timestamp}_export');
    expect(wrapper.text()).toMatch(/Preview:\s*roles_\d+_export\.json/);
  });
});
