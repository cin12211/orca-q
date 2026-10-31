import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getRabbitOverview } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-overview.service';

export default defineBrokerHandler({}, ({ connection }) =>
  getRabbitOverview(connection)
);
