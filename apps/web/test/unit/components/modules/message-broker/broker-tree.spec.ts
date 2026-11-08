import { describe, expect, it } from 'vitest';
import {
  buildBrokerTree,
  type BrokerTreeGroup,
} from '~/components/modules/shared/message-broker/utils';

interface ItemData {
  tag: string;
}

const queues: BrokerTreeGroup<ItemData> = {
  id: 'queues',
  label: 'Queues',
  icon: 'hugeicons:queue-01',
  iconClass: 'text-orange-500',
  itemIcon: 'hugeicons:queue-01',
  itemIconClass: 'text-orange-500',
  items: [
    { id: 'queue:orders', name: 'orders.created', data: { tag: 'a' } },
    { id: 'queue:audit', name: 'events.audit', data: { tag: 'b' } },
  ],
};

describe('buildBrokerTree', () => {
  it('builds one folder per group with its items as files', () => {
    const tree = buildBrokerTree([queues]);

    expect(tree.queues).toMatchObject({
      parentId: null,
      name: 'Queues',
      type: 'folder',
      depth: 0,
      iconOpen: 'hugeicons:queue-01',
      iconClass: 'text-orange-500',
      children: ['queue:orders', 'queue:audit'],
      data: { groupCount: 2 },
    });
    expect(tree['queue:orders']).toMatchObject({
      parentId: 'queues',
      name: 'orders.created',
      type: 'file',
      depth: 1,
      iconClose: 'hugeicons:queue-01',
      iconClass: 'text-orange-500',
      data: { tag: 'a' },
    });
  });

  it('filters items case-insensitively but keeps the total count', () => {
    const tree = buildBrokerTree([queues], '  ORDERS ');

    expect(tree.queues?.children).toEqual(['queue:orders']);
    expect(tree.queues?.data).toEqual({ groupCount: 2 });
    expect(tree['queue:audit']).toBeUndefined();
  });

  it('keeps an empty folder unless the group hides itself when empty', () => {
    const tree = buildBrokerTree([
      { ...queues, id: 'empty', items: [] },
      { ...queues, id: 'hidden', items: [], isHiddenWhenEmpty: true },
    ]);

    expect(tree.empty?.children).toEqual([]);
    expect(tree.hidden).toBeUndefined();
  });

  it('keeps a hide-when-empty group whose items are only filtered out', () => {
    const tree = buildBrokerTree(
      [{ ...queues, isHiddenWhenEmpty: true }],
      'no-match'
    );

    expect(tree.queues?.children).toEqual([]);
  });

  it('lets items override the group icon and color', () => {
    const tree = buildBrokerTree([
      {
        ...queues,
        items: [
          {
            id: 'queue:locked',
            name: 'locked',
            data: { tag: 'c' },
            icon: 'hugeicons:user-lock-01',
            iconClass: 'text-purple-400',
          },
        ],
      },
    ]);

    expect(tree['queue:locked']).toMatchObject({
      iconOpen: 'hugeicons:user-lock-01',
      iconClass: 'text-purple-400',
    });
  });

  it('prefers an explicit group count', () => {
    const tree = buildBrokerTree([{ ...queues, count: 120 }]);

    expect(tree.queues?.data).toEqual({ groupCount: 120 });
  });
});
