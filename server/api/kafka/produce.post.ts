import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { produceKafkaMessage } from '~/server/infrastructure/nosql/kafka/kafka-message.service';

export default defineBrokerHandler(
  {
    topic: z.string().min(1),
    key: z.string().optional(),
    value: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    partition: z.number().int().min(0).optional(),
  },
  ({ connection, ...message }) => produceKafkaMessage(connection, message)
);
