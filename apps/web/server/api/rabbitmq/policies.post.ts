import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listRabbitPolicies } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler({}, ({ connection }) =>
  listRabbitPolicies(connection)
);
