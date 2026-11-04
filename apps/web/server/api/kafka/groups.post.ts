import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listKafkaConsumerGroups } from '~/server/infrastructure/nosql/kafka/kafka-group.service';

export default defineBrokerHandler({}, ({ connection }) =>
  listKafkaConsumerGroups(connection)
);
