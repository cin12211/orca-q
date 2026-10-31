import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listRabbitQueues } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-browser.service';

export default defineBrokerHandler(
  {
    vhost: z.string().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
    search: z.string().optional(),
  },
  ({ connection, ...options }) => listRabbitQueues(connection, options)
);
