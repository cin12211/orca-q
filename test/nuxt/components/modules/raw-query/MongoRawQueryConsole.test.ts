import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoRawQueryConsole from '~/components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue';

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
