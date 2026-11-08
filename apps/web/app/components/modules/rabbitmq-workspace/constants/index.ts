export const RABBIT_QUEUE_PAGE_SIZE = 200;
export const RABBIT_PEEK_COUNT_OPTIONS = [5, 20, 50] as const;
export const RABBIT_DEFAULT_EXCHANGE_LABEL = '(AMQP default)';

/** Exchange types RabbitMQ creates for every vhost; hidden from the sidebar. */
export const isBuiltInRabbitExchange = (name: string) =>
  name === '' || name.startsWith('amq.');

/** RabbitMQ brand orange, used for queue and exchange icons. */
export const RABBIT_ICON_CLASS = 'text-orange-500';

export const RABBIT_TAB_ICONS = {
  queue: 'hugeicons:queue-01',
  exchange: 'hugeicons:flow-connection',
  queueList: 'hugeicons:list-view',
  connections: 'hugeicons:plug-socket',
  user: 'hugeicons:user',
  definitions: 'hugeicons:file-sync',
  exportDefinitions: 'hugeicons:file-export',
  importDefinitions: 'hugeicons:file-import',
} as const;

export type RabbitDefinitionsMode = 'export' | 'import';

/** Tabs of the Management Definitions tool, like PG Backup & Restore. */
export const RABBIT_DEFINITIONS_SECTIONS: {
  id: RabbitDefinitionsMode;
  label: string;
  icon: string;
  subtitle: string;
}[] = [
  {
    id: 'export',
    label: 'Export',
    icon: RABBIT_TAB_ICONS.exportDefinitions,
    subtitle: 'Download the broker configuration as JSON',
  },
  {
    id: 'import',
    label: 'Import',
    icon: RABBIT_TAB_ICONS.importDefinitions,
    subtitle: 'Merge a definitions JSON file into this broker',
  },
];
export * from './rabbitInsights';
export * from './rabbitUserTags';
