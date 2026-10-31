import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getRabbitConnectionDetail } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  { connectionName: z.string().min(1) },
  ({ connection, connectionName }) =>
    getRabbitConnectionDetail(connection, connectionName)
);
