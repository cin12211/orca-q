import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoQuickQueryControlBar from '~/components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue';
import {
  MongoCollectionViewMode,
  MongoExportScope,
} from '~/components/modules/quick-query/mongodb/types';

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

const mountControlBar = (props: Record<string, unknown> = {}) =>
  mount(MongoQuickQueryControlBar, {
    props: {
      ...defaultProps,
      ...props,
    },
    global: {
      stubs: {
        Tooltip: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipProvider: { template: '<div><slot /></div>' },
      },
    },
  });

describe('MongoQuickQueryControlBar', () => {
  it('renders insert button and pagination info', () => {
    const wrapper = mountControlBar();

    expect(wrapper.text()).toContain('Insert');
    expect(wrapper.text()).toContain('1-25');
    expect(wrapper.text()).toContain('100');
    expect(wrapper.text()).toContain('Export');
  });

  it('renders 0-0 of 0 rows when empty', () => {
    const wrapper = mountControlBar({
      totalRows: 0,
      currentTotalRows: 0,
    });

    expect(wrapper.text()).toContain('0-0 of 0');
  });

  it('emits onInsertClick when insert button is clicked', async () => {
    const wrapper = mountControlBar();

    const buttons = wrapper.findAll('button');
    const insertBtn = buttons.find(b => b.text().includes('Insert'));
    expect(insertBtn).toBeDefined();

    await insertBtn!.trigger('click');
    expect(wrapper.emitted('onInsertClick')).toBeTruthy();
  });

  it('renders tabs and emits update:viewMode when clicking Info tab', async () => {
    const wrapper = mountControlBar();

    expect(wrapper.find('[data-testid="mongo-view-mode-list"]').exists()).toBe(
      true
    );
    const infoTab = wrapper.find('[data-testid="mongo-view-mode-info"]');
    expect(infoTab.exists()).toBe(true);

    await infoTab.trigger('mousedown', { button: 0 });
    expect(wrapper.emitted('update:viewMode')?.[0]).toEqual([
      MongoCollectionViewMode.Info,
    ]);
  });

  it('renders Options button and emits onToggleMoreOptions when clicked', async () => {
    const wrapper = mountControlBar();
    const moreBtn = wrapper
      .findAll('button')
      .find(b => b.text().includes('Options'));
    expect(moreBtn?.exists()).toBe(true);

    await moreBtn!.trigger('click');
    expect(wrapper.emitted('onToggleMoreOptions')).toBeTruthy();
  });
});
