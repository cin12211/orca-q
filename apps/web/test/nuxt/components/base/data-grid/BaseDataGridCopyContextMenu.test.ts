import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BaseDataGridCopyContextMenu from '~/components/base/data-grid/components/BaseDataGridCopyContextMenu.vue';
import { copyColumnData } from '~/core/helpers/copyData';

vi.mock('~/core/helpers/copyData', async () => {
  const actual = await vi.importActual<
    typeof import('~/core/helpers/copyData')
  >('~/core/helpers/copyData');

  return {
    ...actual,
    copyColumnData: vi.fn(),
    copyRowsData: vi.fn(),
    copyToClipboard: vi.fn(),
  };
});

describe('BaseDataGridCopyContextMenu', () => {
  it('uses the AG Grid column id when copying column data', () => {
    const rows = [{ user_id: 1 }, { user_id: 2 }];

    const wrapper = mount(BaseDataGridCopyContextMenu, {
      props: {
        data: rows,
        selectedRows: [],
        cellContextMenu: {
          column: {
            getColId: () => 'user_id',
            getColDef: () => ({ headerName: 'User ID' }),
          },
          value: 1,
          data: rows[0],
        },
      },
      global: {
        stubs: {
          BaseContextMenu: {
            name: 'BaseContextMenu',
            props: ['contextMenuItems'],
            template: '<div><slot /></div>',
          },
        },
      },
    });

    const menuItems = wrapper
      .getComponent({ name: 'BaseContextMenu' })
      .props('contextMenuItems') as Array<Record<string, unknown>>;
    const copyColumn = menuItems.find(item => item.title === 'Copy column') as {
      items: Array<Record<string, unknown>>;
    };
    const copyAllAsText = copyColumn.items.find(
      item => item.title === 'Copy all as text'
    ) as {
      select: () => void;
    };

    copyAllAsText.select();

    expect(copyColumnData).toHaveBeenCalledWith(rows, 'user_id', 'list');
  });
});
