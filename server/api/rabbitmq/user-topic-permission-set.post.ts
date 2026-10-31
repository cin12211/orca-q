import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { setRabbitTopicPermission } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    userName: z.string().min(1),
    permission: z.object({
      vhost: z.string().min(1),
      exchange: z.string().min(1),
      write: z.string(),
      read: z.string(),
    }),
  },
  ({ connection, userName, permission }) =>
    setRabbitTopicPermission(connection, userName, permission)
);
