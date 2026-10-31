import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { listRabbitExchanges } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-browser.service';

export default defineBrokerHandler(
  { vhost: z.string().optional() },
  ({ connection, vhost }) => listRabbitExchanges(connection, vhost)
);
