import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { setRabbitPermission } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    userName: z.string().min(1),
    permission: z.object({
      vhost: z.string().min(1),
      configure: z.string(),
      write: z.string(),
      read: z.string(),
    }),
  },
  ({ connection, userName, permission }) =>
    setRabbitPermission(connection, userName, permission)
);
