import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { createRabbitUser } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    name: z.string().trim().min(1),
    password: z.string().min(1),
    tags: z.array(z.string()),
    permission: z
      .object({
        vhost: z.string(),
        configure: z.string(),
        write: z.string(),
        read: z.string(),
      })
      .optional(),
  },
  ({ connection, ...user }) => createRabbitUser(connection, user)
);
