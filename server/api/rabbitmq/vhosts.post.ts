import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listRabbitVhosts } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-browser.service';

export default defineBrokerHandler({}, ({ connection }) =>
  listRabbitVhosts(connection)
);
