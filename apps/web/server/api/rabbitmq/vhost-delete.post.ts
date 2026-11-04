import { z } from 'zod';
import { defineBrokerHandler } from '~/server/infrastructure/nosql/broker/broker-route';
import { deleteRabbitVhost } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-admin.service';

export default defineBrokerHandler(
  { vhost: z.string().min(1) },
  ({ connection, vhost }) => deleteRabbitVhost(connection, vhost)
);
