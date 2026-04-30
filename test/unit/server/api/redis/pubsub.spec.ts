import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import messagesHandler from '~/server/api/redis/pubsub/messages.post';
import overviewHandler from '~/server/api/redis/pubsub/overview.post';
import publishHandler from '~/server/api/redis/pubsub/publish.post';
import subscribeHandler from '~/server/api/redis/pubsub/subscribe.post';
import unsubscribeHandler from '~/server/api/redis/pubsub/unsubscribe.post';

const {
  readBodyMock,
  getRedisPubSubOverviewMock,
  subscribeRedisPubSubMock,
  getRedisPubSubMessagesMock,
  publishRedisPubSubMessageMock,
  closeRedisPubSubSessionMock,
} = vi.hoisted(() => ({
  readBodyMock: vi.fn(),
  getRedisPubSubOverviewMock: vi.fn(),
  subscribeRedisPubSubMock: vi.fn(),
  getRedisPubSubMessagesMock: vi.fn(),
  publishRedisPubSubMessageMock: vi.fn(),
  closeRedisPubSubSessionMock: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
});

vi.mock('h3', async importOriginal => {
  const actual = await importOriginal<typeof import('h3')>();

  return {
    ...actual,
    readBody: readBodyMock,
  };
});

vi.mock('~/server/infrastructure/nosql/redis/redis-pubsub.service', () => ({
  getRedisPubSubOverview: getRedisPubSubOverviewMock,
  subscribeRedisPubSub: subscribeRedisPubSubMock,
  getRedisPubSubMessages: getRedisPubSubMessagesMock,
  publishRedisPubSubMessage: publishRedisPubSubMessageMock,
  closeRedisPubSubSession: closeRedisPubSubSessionMock,
}));

describe('Redis Pub/Sub routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards overview requests to the Redis Pub/Sub service', async () => {
    readBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      databaseIndex: 2,
      sessionId: 'session-1',
    });
    getRedisPubSubOverviewMock.mockResolvedValue({ ok: true });

    const result = await overviewHandler({} as never);

    expect(result).toEqual({ ok: true });
    expect(getRedisPubSubOverviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
        databaseIndex: 2,
      }),
      'session-1'
    );
  });

  it('forwards subscribe requests to the Redis Pub/Sub service', async () => {
    readBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      databaseIndex: 1,
      target: 'orders.events',
      mode: 'channel',
      sessionId: 'session-1',
    });
    subscribeRedisPubSubMock.mockResolvedValue({ ok: true });

    const result = await subscribeHandler({} as never);

    expect(result).toEqual({ ok: true });
    expect(subscribeRedisPubSubMock).toHaveBeenCalledWith(
      expect.objectContaining({
        databaseIndex: 1,
      }),
      'orders.events',
      'channel',
      'session-1'
    );
  });

  it('forwards message polling requests to the Redis Pub/Sub service', async () => {
    readBodyMock.mockResolvedValue({
      sessionId: 'session-2',
    });
    getRedisPubSubMessagesMock.mockResolvedValue({ ok: true });

    const result = await messagesHandler({} as never);

    expect(result).toEqual({ ok: true });
    expect(getRedisPubSubMessagesMock).toHaveBeenCalledWith('session-2');
  });

  it('forwards publish requests to the Redis Pub/Sub service', async () => {
    readBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      databaseIndex: 0,
      channel: 'orders.events',
      payload: '{"status":"paid"}',
    });
    publishRedisPubSubMessageMock.mockResolvedValue({ ok: true });

    const result = await publishHandler({} as never);

    expect(result).toEqual({ ok: true });
    expect(publishRedisPubSubMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        databaseIndex: 0,
      }),
      'orders.events',
      '{"status":"paid"}'
    );
  });

  it('forwards unsubscribe requests to the Redis Pub/Sub service', async () => {
    readBodyMock.mockResolvedValue({
      sessionId: 'session-3',
    });
    closeRedisPubSubSessionMock.mockResolvedValue({ closed: true });

    const result = await unsubscribeHandler({} as never);

    expect(result).toEqual({ closed: true });
    expect(closeRedisPubSubSessionMock).toHaveBeenCalledWith('session-3');
  });
});
