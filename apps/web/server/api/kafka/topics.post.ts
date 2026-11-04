import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listKafkaTopics } from '~/server/infrastructure/nosql/kafka/kafka-topic.service';

export default defineBrokerHandler({}, ({ connection }) =>
  listKafkaTopics(connection)
);
