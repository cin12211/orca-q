import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoQuickQueryControlBar from '~/components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue';
import {
  MongoCollectionViewMode,
  MongoExportScope,
} from '~/components/modules/quick-query/mongodb/types';

describe('MongoQuickQueryControlBar', () => {
  const defaultProps = {
    totalRows: 100,
    currentTotalRows: 25,
    limit: 25,
    skip: 0,
    isLoading: false,
    viewMode: MongoCollectionViewMode.List,
    isShowFilters: false,
    activeFilterCount: 0,
  };

  it('renders insert button and pagination info', () => {
    const wrapper = mount(MongoQuickQueryControlBar, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('Insert');
    expect(wrapper.text()).toContain('1-25');
    expect(wrapper.text()).toContain('100');
    expect(wrapper.text()).toContain('Export');
  });

  it('renders 0-0 of 0 rows when empty', () => {
    const wrapper = mount(MongoQuickQueryControlBar, {
      props: {
        ...defaultProps,
        totalRows: 0,
        currentTotalRows: 0,
      },
    });

    expect(wrapper.text()).toContain('0-0 of 0');
  });

  it('emits onInsertClick when insert button is clicked', async () => {
    const wrapper = mount(MongoQuickQueryControlBar, {
      props: defaultProps,
    });

    const buttons = wrapper.findAll('button');
    const insertBtn = buttons.find(b => b.text().includes('Insert'));
    expect(insertBtn).toBeDefined();

    await insertBtn!.trigger('click');
    expect(wrapper.emitted('onInsertClick')).toBeTruthy();
  });
});
