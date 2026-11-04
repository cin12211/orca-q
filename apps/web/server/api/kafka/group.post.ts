import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getKafkaConsumerGroupDetail } from '~/server/infrastructure/nosql/kafka/kafka-group.service';

export default defineBrokerHandler(
  { groupId: z.string().min(1) },
  ({ connection, groupId }) => getKafkaConsumerGroupDetail(connection, groupId)
);
