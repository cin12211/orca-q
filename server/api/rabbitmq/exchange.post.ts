import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { getRabbitExchangeDetail } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-browser.service';

export default defineBrokerHandler(
  { vhost: z.string(), exchangeName: z.string() },
  ({ connection, vhost, exchangeName }) =>
    getRabbitExchangeDetail(connection, vhost, exchangeName)
);
