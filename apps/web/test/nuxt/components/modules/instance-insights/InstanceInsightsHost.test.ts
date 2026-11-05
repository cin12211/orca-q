import { defineComponent, h } from 'vue';
import { DatabaseClientType } from '#shared/constants/database-client-type';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { InstanceInsightsHost } from '~/components/modules/instance-insights';
import type { Connection } from '~/core/stores';

const createPanelStub = (testId: string) =>
  defineComponent({
    props: { connection: { type: Object, required: true } },
    setup: props => () =>
      h('div', { 'data-testid': testId }, (props.connection as Connection).id),
  });

vi.mock('~/components/modules/sql-family-workspace', () => ({
  SqlInstanceInsightsPanel: createPanelStub('sql-panel'),
}));

vi.mock('~/components/modules/redis-workspace', () => ({
  RedisInstanceInsightsPanel: createPanelStub('redis-panel'),
}));

vi.mock('~/components/modules/rabbitmq-workspace', () => ({
  RabbitInstanceInsightsPanel: createPanelStub('rabbitmq-panel'),
}));

vi.mock('~/components/modules/kafka-workspace', () => ({
  KafkaInstanceInsightsPanel: createPanelStub('kafka-panel'),
}));

vi.mock('~/components/modules/mongodb-workspace', () => ({
  MongoInstanceInsightsPanel: createPanelStub('mongodb-panel'),
}));

vi.mock('~/core/persist/storage-adapter', () => ({
  initPlatformStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/core/persist/migration', () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

const createConnection = (type: DatabaseClientType): Connection =>
  ({
    id: `${type}-conn`,
    name: `${type} fixture`,
    type,
  }) as Connection;

const mountHost = (connection: Connection | null) =>
  mount(InstanceInsightsHost, {
    props: { connection },
    global: { stubs: { Icon: true } },
  });

describe('InstanceInsightsHost', () => {
  it('shows the empty state without a connection', () => {
    const wrapper = mountHost(null);

    expect(wrapper.text()).toContain(
      'Select a connection to open Instance Insights'
    );
  });

  it.each([
    [DatabaseClientType.POSTGRES, 'sql-panel'],
    [DatabaseClientType.MYSQL, 'sql-panel'],
    [DatabaseClientType.DUCKDB, 'sql-panel'],
    [DatabaseClientType.MONGODB, 'mongodb-panel'],
    [DatabaseClientType.REDIS, 'redis-panel'],
    [DatabaseClientType.RABBITMQ, 'rabbitmq-panel'],
    [DatabaseClientType.KAFKA, 'kafka-panel'],
  ])('renders the %s connection with %s', async (type, testId) => {
    const connection = createConnection(type);
    const wrapper = mountHost(connection);

    // Panels are async components: wait for the lazy import to resolve.
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true);
    });
    expect(wrapper.find(`[data-testid="${testId}"]`).text()).toBe(
      connection.id
    );
  });
});
