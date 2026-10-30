import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { exportRabbitDefinitions } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-definitions.service';

export default defineBrokerHandler(
  { vhost: z.string().optional() },
  ({ connection, vhost }) => exportRabbitDefinitions(connection, vhost)
);
