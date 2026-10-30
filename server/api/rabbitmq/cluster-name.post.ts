import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { setRabbitClusterName } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  { name: z.string().trim().min(1) },
  ({ connection, name }) => setRabbitClusterName(connection, name)
);
