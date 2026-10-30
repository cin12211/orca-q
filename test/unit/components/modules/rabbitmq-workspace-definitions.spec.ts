import { describe, expect, it } from 'vitest';
import {
  isRabbitDefinitions,
  summarizeRabbitDefinitions,
} from '~/components/modules/rabbitmq-workspace/utils';

describe('RabbitMQ definitions files', () => {
  it('summarizes a whole-broker export', () => {
    expect(
      summarizeRabbitDefinitions({
        rabbitmq_definition_format: 'cluster',
        rabbitmq_version: '4.4.0',
        users: [{}, {}],
        vhosts: [{}],
        queues: [],
        policies: 'not-a-list',
      })
    ).toEqual({
      format: 'cluster',
      rabbitmqVersion: '4.4.0',
      counts: { users: 2, vhosts: 1, queues: 0 },
    });
  });

  it('falls back to unknown format and older version keys', () => {
    const summary = summarizeRabbitDefinitions({
      rabbit_version: '3.13.1',
      exchanges: [{}],
    });

    expect(summary.format).toBe('unknown');
    expect(summary.rabbitmqVersion).toBe('3.13.1');
  });

  it('only accepts objects with a known section', () => {
    expect(isRabbitDefinitions({ queues: [] })).toBe(true);
    expect(isRabbitDefinitions({ name: 'x' })).toBe(false);
    expect(isRabbitDefinitions([])).toBe(false);
  });
});
