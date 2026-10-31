import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { saveRabbitVhost } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  {
    vhost: z.object({
      name: z.string().trim().min(1),
      description: z.string(),
      tags: z.array(z.string()),
      defaultQueueType: z.enum(['classic', 'quorum', 'stream']),
      isTracing: z.boolean(),
    }),
    isNew: z.boolean(),
  },
  ({ connection, vhost, isNew }) => saveRabbitVhost(connection, vhost, isNew)
);
