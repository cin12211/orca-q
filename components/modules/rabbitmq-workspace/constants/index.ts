export const RABBIT_QUEUE_PAGE_SIZE = 200;
export const RABBIT_PEEK_COUNT_OPTIONS = [5, 20, 50] as const;
export const RABBIT_DEFAULT_EXCHANGE_LABEL = '(AMQP default)';

/** Exchange types RabbitMQ creates for every vhost; hidden from the sidebar. */
export const isBuiltInRabbitExchange = (name: string) =>
  name === '' || name.startsWith('amq.');

export const RABBIT_TAB_ICONS = {
  queue: 'hugeicons:inbox',
  exchange: 'hugeicons:arrow-data-transfer-horizontal',
  queueList: 'hugeicons:list-view',
  connections: 'hugeicons:plug-socket',
} as const;
