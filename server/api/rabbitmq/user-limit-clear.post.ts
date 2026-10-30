import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { clearRabbitUserLimit } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    userName: z.string().min(1),
    limitName: z.enum(['max-connections', 'max-channels']),
  },
  ({ connection, userName, limitName }) =>
    clearRabbitUserLimit(connection, userName, limitName)
);
