import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { importRabbitDefinitions } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-definitions.service';

export default defineBrokerHandler(
  {
    definitions: z.record(z.string(), z.unknown()),
    vhost: z.string().optional(),
  },
  ({ connection, definitions, vhost }) =>
    importRabbitDefinitions(connection, definitions, vhost)
);
