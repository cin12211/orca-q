import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getRabbitLimits } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler({}, ({ connection }) =>
  getRabbitLimits(connection)
);
