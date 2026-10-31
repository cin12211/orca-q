import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { publishRabbitMessage } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-message.service';

export default defineBrokerHandler(
  {
    vhost: z.string(),
    exchange: z.string(),
    routingKey: z.string(),
    payload: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    contentType: z.string().optional(),
    isPersistent: z.boolean().optional(),
  },
  ({ connection, ...message }) => publishRabbitMessage(connection, message)
);
