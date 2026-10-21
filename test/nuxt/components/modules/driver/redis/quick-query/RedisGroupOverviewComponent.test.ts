import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RedisGroupOverview from '~/components/modules/driver/redis/quick-query/components/RedisGroupOverview.vue';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';

const items: RedisKeyListItem[] = [
  {
    key: 'orders:1',
    type: 'string',
    ttl: 120,
    memoryUsage: 1024,
    memoryUsageHuman: '1.0 KB',
  },
  {
    key: 'orders:2',
    type: 'hash',
    ttl: -1,
    memoryUsage: null,
    memoryUsageHuman: null,
  },
];

const mountOverview = (props: Record<string, unknown> = {}) =>
  mount(RedisGroupOverview, {
    props: { prefix: 'orders', keyCount: 2, ...props },
    global: {
      stubs: {
        Icon: true,
        LoadingOverlay: {
          props: ['visible'],
          template: '<div v-if="visible" data-test="loading-overlay" />',
        },
        BaseDataGrid: {
          name: 'BaseDataGrid',
          props: ['columnDefs', 'rowData'],
          template: '<div data-test="grid" />',
        },
      },
    },
  });

describe('RedisGroupOverview', () => {
  it('passes the group keys to the grid with key/size/ttl/type columns', () => {
    const wrapper = mountOverview({ items });
    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    const headers = (grid.props('columnDefs') as { headerName?: string }[])
      .map(c => c.headerName)
      .filter(h => h && h !== '#');

    expect(headers).toEqual(['Key', 'Size', 'TTL', 'Data Type']);
    expect(grid.props('rowData')).toHaveLength(2);
    expect(grid.props('rowData')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'orders:1', size: 1024, ttl: 120 }),
      ])
    );
  });

  it('shows the loading overlay while keys are loading', () => {
    expect(
      mountOverview({ loading: true })
        .find('[data-test="loading-overlay"]')
        .exists()
    ).toBe(true);
    expect(mountOverview().find('[data-test="loading-overlay"]').exists()).toBe(
      false
    );
  });
});
