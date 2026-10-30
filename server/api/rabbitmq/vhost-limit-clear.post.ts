import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { clearRabbitVhostLimit } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  {
    vhost: z.string().min(1),
    limitName: z.enum(['max-connections', 'max-queues']),
  },
  ({ connection, vhost, limitName }) =>
    clearRabbitVhostLimit(connection, vhost, limitName)
);
