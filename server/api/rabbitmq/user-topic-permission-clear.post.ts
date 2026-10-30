import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { clearRabbitTopicPermission } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    userName: z.string().min(1),
    vhost: z.string().min(1),
    exchange: z.string().min(1),
  },
  ({ connection, userName, vhost, exchange }) =>
    clearRabbitTopicPermission(connection, userName, { vhost, exchange })
);
