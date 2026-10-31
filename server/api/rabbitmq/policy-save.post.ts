import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { saveRabbitPolicy } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  {
    policy: z.object({
      kind: z.enum(['user', 'operator']),
      vhost: z.string().min(1),
      name: z.string().trim().min(1),
      pattern: z.string(),
      applyTo: z.string().min(1),
      priority: z.number().int(),
      definition: z.record(z.string(), z.unknown()),
    }),
    previousName: z.string().optional(),
  },
  ({ connection, policy, previousName }) =>
    saveRabbitPolicy(connection, policy, previousName)
);
