import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getRabbitFeatureFlags } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler({}, ({ connection }) =>
  getRabbitFeatureFlags(connection)
);
