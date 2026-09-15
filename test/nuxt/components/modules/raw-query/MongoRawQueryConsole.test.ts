import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoRawQueryConsole from '~/components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue';

vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: (options: any) => ({
    value: {
      getVirtualItems: () =>
        Array.from({ length: options?.count ?? 0 }, (_, i) => ({
          index: i,
          key: i,
          start: i * 32,
        })),
      getTotalSize: () => (options?.count ?? 0) * 32,
      measureElement: () => {},
      measure: () => {},
      scrollToIndex: () => {},
    },
  }),
}));

describe('MongoRawQueryConsole', () => {
  it('renders streamed log entries in order with inspectable object values', () => {
    const wrapper = mount(MongoRawQueryConsole, {
      props: {
        logs: [
          { level: 'log', args: ['before query', { count: 2 }] },
          { level: 'warn', args: ['slow cursor'] },
          { level: 'error', args: ['query failed'] },
        ],
      },
      global: {
        stubs: {
          Tooltip: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          Icon: true,
        },
      },
    });

    const console = wrapper.get('[data-testid="mongo-raw-query-console"]');
    expect(console.get('[data-testid="mongo-console-title"]').text()).toBe(
      'Console'
    );
    expect(console.findAll('[data-testid="mongo-console-entry"]')).toHaveLength(
      3
    );
    expect(
      console
        .findAll('[data-testid="mongo-console-entry"]')
        .map(entry => entry.get('[data-testid="mongo-console-message"]').text())
    ).toEqual([
      '[log] before query {"count":Int32(2)}',
      '[warn] slow cursor',
      '[error] query failed',
    ]);
  });

  it('renders a helpful empty state without breaking theme tokens', () => {
    const wrapper = mount(MongoRawQueryConsole, { props: { logs: [] } });

    expect(wrapper.get('[data-testid="mongo-console-empty"]').text()).toContain(
      'No console output'
    );
    expect(
      wrapper.get('[data-testid="mongo-raw-query-console"]').classes()
    ).toContain('bg-background');
  });
});
