import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { closeRabbitConnection } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  {
    connectionName: z.string().min(1),
    reason: z.string().trim().min(1).max(200),
  },
  ({ connection, connectionName, reason }) =>
    closeRabbitConnection(connection, connectionName, reason)
);
