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

    expect(wrapper.get('[data-testid="mongo-raw-query-console"]').text()).toBe(
      '[log] before query {"count":2}\n[warn] slow cursor\n[error] query failed'
    );
  });
});
