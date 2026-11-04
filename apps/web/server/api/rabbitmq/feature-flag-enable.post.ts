import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { enableRabbitFeatureFlag } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  { name: z.string().min(1) },
  ({ connection, name }) => enableRabbitFeatureFlag(connection, name)
);
