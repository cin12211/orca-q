import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listRabbitVhostDetails } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler({}, ({ connection }) =>
  listRabbitVhostDetails(connection)
);
