import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getKafkaTopicDetail } from '~/server/infrastructure/nosql/kafka/kafka-topic.service';

export default defineBrokerHandler(
  { topic: z.string().min(1) },
  ({ connection, topic }) => getKafkaTopicDetail(connection, topic)
);
