import { getBrokerConnectionPayload } from '~/core/helpers/broker-connection';
import type { Connection } from '~/core/stores';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import type {
  RabbitConnectionsSnapshot,
  RabbitExchangeDetail,
  RabbitExchangeSummary,
  RabbitOverview,
  RabbitPublishInput,
  RabbitPublishResult,
  RabbitQueueDetail,
  RabbitQueuePage,
} from '~/core/types/rabbitmq.types';

const post = <T>(
  path: string,
  connection: Connection,
  body: Record<string, unknown> = {}
) =>
  $fetch<T>(`/api/rabbitmq/${path}`, {
    method: 'POST',
    body: { connection: getBrokerConnectionPayload(connection), ...body },
  });

export const rabbitmqService = {
  overview: (connection: Connection) =>
    post<RabbitOverview>('overview', connection),
  vhosts: (connection: Connection) => post<string[]>('vhosts', connection),
  queues: (
    connection: Connection,
    options: {
      vhost?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    }
  ) => post<RabbitQueuePage>('queues', connection, options),
  queue: (connection: Connection, vhost: string, queueName: string) =>
    post<RabbitQueueDetail>('queue', connection, { vhost, queueName }),
  exchanges: (connection: Connection, vhost?: string) =>
    post<RabbitExchangeSummary[]>('exchanges', connection, { vhost }),
  exchange: (connection: Connection, vhost: string, exchangeName: string) =>
    post<RabbitExchangeDetail>('exchange', connection, { vhost, exchangeName }),
  connections: (connection: Connection, vhost?: string) =>
    post<RabbitConnectionsSnapshot>('connections', connection, { vhost }),
  peek: (
    connection: Connection,
    vhost: string,
    queueName: string,
    count: number
  ) => post<BrokerMessage[]>('peek', connection, { vhost, queueName, count }),
  publish: (connection: Connection, message: RabbitPublishInput) =>
    post<RabbitPublishResult>('publish', connection, { ...message }),
};
