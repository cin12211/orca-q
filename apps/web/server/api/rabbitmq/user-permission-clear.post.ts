import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { clearRabbitPermission } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  { userName: z.string().min(1), vhost: z.string().min(1) },
  ({ connection, userName, vhost }) =>
    clearRabbitPermission(connection, userName, vhost)
);
