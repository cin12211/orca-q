import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { setRabbitVhostLimit } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  {
    vhost: z.string().min(1),
    limit: z.object({
      name: z.enum(['max-connections', 'max-queues']),
      value: z.number().int().min(0),
    }),
  },
  ({ connection, vhost, limit }) =>
    setRabbitVhostLimit(connection, vhost, limit)
);
