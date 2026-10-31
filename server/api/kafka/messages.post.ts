import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { readKafkaMessages } from '~/server/infrastructure/nosql/kafka/kafka-message.service';

const cursorSchema = z.object({
  partition: z.number().int().min(0),
  offset: z.string(),
});

export default defineBrokerHandler(
  {
    topic: z.string().min(1),
    partitions: z.array(z.number().int().min(0)).optional(),
    start: z.enum(['earliest', 'latest', 'offset', 'timestamp']),
    offset: z.string().optional(),
    timestamp: z.number().optional(),
    limit: z.number().int().positive().optional(),
    cursors: z.array(cursorSchema).optional(),
  },
  ({ connection, ...query }) => readKafkaMessages(connection, query)
);
