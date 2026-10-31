import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { peekRabbitMessages } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-message.service';

export default defineBrokerHandler(
  {
    vhost: z.string(),
    queueName: z.string().min(1),
    count: z.number().int().positive().optional(),
  },
  ({ connection, ...options }) => peekRabbitMessages(connection, options)
);
