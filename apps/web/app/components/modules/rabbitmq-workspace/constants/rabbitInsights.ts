export type RabbitInsightsSectionId =
  | 'overview'
  | 'nodes'
  | 'connections'
  | 'channels'
  | 'vhosts'
  | 'policies'
  | 'limits'
  | 'feature-flags'
  | 'ports';

/** Tabs of RabbitMQ Instance Insights, in Management UI order. */
export const RABBIT_INSIGHTS_SECTIONS: {
  id: RabbitInsightsSectionId;
  label: string;
}[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'nodes', label: 'Nodes' },
  { id: 'connections', label: 'Connections' },
  { id: 'channels', label: 'Channels' },
  { id: 'vhosts', label: 'Virtual Hosts' },
  { id: 'policies', label: 'Policies' },
  { id: 'limits', label: 'Limits' },
  { id: 'feature-flags', label: 'Feature Flags' },
  { id: 'ports', label: 'Ports & Contexts' },
];

export const RABBIT_REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
] as const;

export const RABBIT_DEFAULT_REFRESH_MS = 5000;

export const RABBIT_QUEUE_TYPES = ['classic', 'quorum', 'stream'] as const;

export const RABBIT_VHOST_LIMIT_OPTIONS: {
  name: 'max-connections' | 'max-queues';
  description: string;
}[] = [
  {
    name: 'max-connections',
    description: 'Client connections allowed on this virtual host.',
  },
  { name: 'max-queues', description: 'Queues allowed on this virtual host.' },
];

export const RABBIT_POLICY_APPLY_TO = [
  { value: 'all', label: 'Exchanges and queues' },
  { value: 'exchanges', label: 'Exchanges' },
  { value: 'queues', label: 'Queues (all types)' },
  { value: 'classic_queues', label: 'Classic queues' },
  { value: 'quorum_queues', label: 'Quorum queues' },
  { value: 'streams', label: 'Streams' },
] as const;

/** Common policy keys offered as one-click snippets in the policy editor. */
export const RABBIT_POLICY_KEY_HINTS: { key: string; example: unknown }[] = [
  { key: 'message-ttl', example: 60000 },
  { key: 'expires', example: 1800000 },
  { key: 'max-length', example: 10000 },
  { key: 'max-length-bytes', example: 104857600 },
  { key: 'overflow', example: 'reject-publish' },
  { key: 'dead-letter-exchange', example: 'dlx' },
  { key: 'dead-letter-routing-key', example: 'dead' },
  { key: 'delivery-limit', example: 20 },
  { key: 'queue-version', example: 2 },
  { key: 'max-age', example: '7D' },
  { key: 'alternate-exchange', example: 'unrouted' },
];
