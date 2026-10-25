import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import {
  kafkaConnection,
  kafkaSaslConnection,
} from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile kafka
const ORDERS_TOPIC = 'orcaq.orders';
const GROUP_ID = 'orcaq-fixture-group';

interface MessagePage {
  messages: {
    key?: string | null;
    payload: string;
    payloadTransport: string;
    partition?: number;
    offset?: string;
    headers: Record<string, string>;
  }[];
  nextCursors: { partition: number; offset: string }[];
  hasMore: boolean;
}

describe('Kafka API', async () => {
  await setup();

  const post = <T>(path: string, body: Record<string, unknown> = {}) =>
    $fetch<T>(path, {
      method: 'POST',
      body: { connection: kafkaConnection(), ...body },
    });

  const healthCheck = (connection: Record<string, unknown>) =>
    $fetch<{ isConnectedSuccess: boolean; message?: string }>(
      '/api/managment-connection/health-check',
      { method: 'POST', body: { type: 'kafka', ...connection } }
    );

  it('passes the health check over PLAINTEXT and SASL/PLAIN', async () => {
    expect((await healthCheck(kafkaConnection())).isConnectedSuccess).toBe(
      true
    );
    expect((await healthCheck(kafkaSaslConnection())).isConnectedSuccess).toBe(
      true
    );
  });

  it('fails the health check with a wrong SASL password', async () => {
    const result = await healthCheck(kafkaSaslConnection('wrong'));
    expect(result.isConnectedSuccess).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('returns the cluster overview', async () => {
    const overview = await post<{
      brokers: { isController: boolean }[];
      topicCount: number;
      consumerGroupCount: number;
      internalTopicCount: number;
    }>('/api/kafka/overview');

    expect(overview.brokers).toHaveLength(1);
    expect(overview.brokers[0].isController).toBe(true);
    expect(overview.topicCount).toBeGreaterThanOrEqual(2);
    expect(overview.consumerGroupCount).toBeGreaterThanOrEqual(1);
    expect(overview.internalTopicCount).toBeGreaterThanOrEqual(1);
  });

  it('lists topics with message counts', async () => {
    const topics = await post<
      {
        name: string;
        partitionCount: number;
        messageCount: number;
        isInternal: boolean;
      }[]
    >('/api/kafka/topics');
    const orders = topics.find(topic => topic.name === ORDERS_TOPIC);

    expect(orders?.partitionCount).toBe(3);
    expect(orders?.messageCount).toBe(30);
    // Kafka's internal topics are counted in the overview but not listed.
    expect(topics.some(topic => topic.name === '__consumer_offsets')).toBe(
      false
    );
  });

  it('returns topic detail with partitions, configs and groups', async () => {
    const detail = await post<{
      partitions: { endOffset: string }[];
      configs: { name: string }[];
      consumerGroups: { groupId: string; lag: number }[];
    }>('/api/kafka/topic', { topic: ORDERS_TOPIC });

    expect(detail.partitions.map(partition => partition.endOffset)).toEqual([
      '10',
      '10',
      '10',
    ]);
    expect(detail.configs.some(config => config.name === 'retention.ms')).toBe(
      true
    );
    expect(
      detail.consumerGroups.find(group => group.groupId === GROUP_ID)?.lag
    ).toBe(18);
  });

  it('reads the earliest messages and pages forward', async () => {
    const first = await post<MessagePage>('/api/kafka/messages', {
      topic: ORDERS_TOPIC,
      partitions: [0],
      start: 'earliest',
      limit: 4,
    });

    expect(first.messages).toHaveLength(4);
    expect(first.messages[0].offset).toBe('0');
    expect(first.messages[0].key).toBe('order-0');
    expect(first.messages[0].headers.source).toBe('fixture');
    expect(first.hasMore).toBe(true);

    const second = await post<MessagePage>('/api/kafka/messages', {
      topic: ORDERS_TOPIC,
      start: 'earliest',
      limit: 4,
      cursors: first.nextCursors,
    });
    expect(second.messages[0].offset).toBe('4');
  });

  it('reads the latest messages across partitions', async () => {
    const page = await post<MessagePage>('/api/kafka/messages', {
      topic: ORDERS_TOPIC,
      start: 'latest',
      limit: 6,
    });

    expect(page.messages).toHaveLength(6);
    expect(new Set(page.messages.map(message => message.partition)).size).toBe(
      3
    );
    expect(page.messages.every(message => Number(message.offset) >= 8)).toBe(
      true
    );
  });

  it('reads from an offset and from a timestamp', async () => {
    const byOffset = await post<MessagePage>('/api/kafka/messages', {
      topic: ORDERS_TOPIC,
      partitions: [1],
      start: 'offset',
      offset: '7',
      limit: 10,
    });
    expect(byOffset.messages.map(message => message.offset)).toEqual([
      '7',
      '8',
      '9',
    ]);

    const byTimestamp = await post<MessagePage>('/api/kafka/messages', {
      topic: ORDERS_TOPIC,
      start: 'timestamp',
      timestamp: Date.now() + 60_000,
      limit: 10,
    });
    expect(byTimestamp.messages).toHaveLength(0);
  });

  it('returns binary values as base64', async () => {
    const page = await post<MessagePage>('/api/kafka/messages', {
      topic: 'orcaq.binary',
      start: 'earliest',
    });

    expect(page.messages[0].payloadTransport).toBe('base64');
  });

  it('does not change committed offsets when reading', async () => {
    const before = await post<{ totalLag: number }>('/api/kafka/group', {
      groupId: GROUP_ID,
    });
    await post('/api/kafka/messages', {
      topic: ORDERS_TOPIC,
      start: 'earliest',
    });
    const after = await post<{ totalLag: number }>('/api/kafka/group', {
      groupId: GROUP_ID,
    });
    const groups = await post<{ groupId: string }[]>('/api/kafka/groups');

    expect(after.totalLag).toBe(before.totalLag);
    expect(groups.map(group => group.groupId)).not.toContain(
      'orcaq-browser-no-group'
    );
  });

  it('lists consumer groups with lag', async () => {
    const groups =
      await post<{ groupId: string; totalLag: number; topics: string[] }[]>(
        '/api/kafka/groups'
      );
    const group = groups.find(item => item.groupId === GROUP_ID);

    expect(group?.totalLag).toBe(18);
    expect(group?.topics).toEqual([ORDERS_TOPIC]);
  });

  it('produces a message and tails it live', async () => {
    const live = await post<{ sessionId: string; isRunning: boolean }>(
      '/api/kafka/live/start',
      { topic: 'orcaq.binary' }
    );
    expect(live.isRunning).toBe(true);

    const produced = await post<{ partition: number; offset: string }>(
      '/api/kafka/produce',
      { topic: 'orcaq.binary', key: 'k1', value: 'hello live' }
    );
    expect(produced.partition).toBe(0);

    let received: MessagePage['messages'] = [];
    for (let attempt = 0; attempt < 20 && !received.length; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const poll = await $fetch<{ messages: MessagePage['messages'] }>(
        '/api/kafka/live/poll',
        { method: 'POST', body: { sessionId: live.sessionId } }
      );
      received = poll.messages;
    }

    expect(received[0]?.payload).toBe('hello live');
    await $fetch('/api/kafka/live/stop', {
      method: 'POST',
      body: { sessionId: live.sessionId },
    });
  });
});
