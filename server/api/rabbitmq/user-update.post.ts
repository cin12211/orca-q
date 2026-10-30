import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { updateRabbitUser } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler(
  {
    name: z.string().min(1),
    tags: z.array(z.string()),
    password: z.string().min(1).optional(),
    shouldRemovePassword: z.boolean().optional(),
  },
  ({ connection, ...user }) => updateRabbitUser(connection, user)
);
