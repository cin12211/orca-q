import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listRabbitUsers } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-users.service';

export default defineBrokerHandler({}, ({ connection }) =>
  listRabbitUsers(connection)
);
