import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { deleteRabbitPolicy } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  {
    kind: z.enum(['user', 'operator']),
    vhost: z.string().min(1),
    name: z.string().min(1),
  },
  ({ connection, ...target }) => deleteRabbitPolicy(connection, target)
);
