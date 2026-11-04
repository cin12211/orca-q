import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { setRabbitUserLimit } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    userName: z.string().min(1),
    limit: z.object({
      name: z.enum(['max-connections', 'max-channels']),
      value: z.number().int().min(-1),
    }),
  },
  ({ connection, userName, limit }) =>
    setRabbitUserLimit(connection, userName, limit)
);
