import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getRabbitQueueDetail } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-browser.service';

export default defineBrokerHandler(
  { vhost: z.string(), queueName: z.string().min(1) },
  ({ connection, vhost, queueName }) =>
    getRabbitQueueDetail(connection, vhost, queueName)
);
