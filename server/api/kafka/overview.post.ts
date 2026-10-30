import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getKafkaClusterOverview } from '~/server/infrastructure/nosql/kafka/kafka-topic.service';

export default defineBrokerHandler({}, ({ connection }) =>
  getKafkaClusterOverview(connection)
);
