import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { startKafkaLive } from '~/server/infrastructure/nosql/kafka/kafka-live.service';

export default defineBrokerHandler(
  {
    topic: z.string().min(1),
    partitions: z.array(z.number().int().min(0)).optional(),
  },
  ({ connection, ...options }) => startKafkaLive(connection, options)
);
