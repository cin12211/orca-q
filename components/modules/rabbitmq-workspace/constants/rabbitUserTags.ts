/** What each built-in RabbitMQ user tag allows, shown next to the tag. */
export const RABBIT_USER_TAG_DESCRIPTIONS: Record<string, string> = {
  administrator:
    'Full Management UI and HTTP API access, including users, vhosts and permissions.',
  monitoring:
    'Sees every vhost, connection, channel and node, but cannot manage them.',
  policymaker:
    'Can manage policies and parameters in the vhosts it can access.',
  management: 'Uses the Management UI for the vhosts it can access.',
  impersonator: 'Can publish messages as another user (forge user-id).',
};

export type RabbitUserGroupId =
  | 'administrator'
  | 'monitoring'
  | 'policymaker'
  | 'management'
  | 'impersonator'
  | 'other'
  | 'none';

export interface RabbitUserGroup {
  id: RabbitUserGroupId;
  /** RabbitMQ's own tag name, as the Management UI shows it. */
  label: string;
  icon: string;
  iconClass: string;
}

/**
 * Users grouped by RabbitMQ user tags, most privileged first. A user sits in
 * the group of its most privileged built-in tag (administrator includes
 * monitoring, policymaker and management).
 */
export const RABBIT_USER_GROUPS: RabbitUserGroup[] = [
  {
    id: 'administrator',
    label: 'administrator',
    icon: 'hugeicons:crown',
    iconClass: 'text-yellow-500',
  },
  {
    id: 'monitoring',
    label: 'monitoring',
    icon: 'hugeicons:analytics-01',
    iconClass: 'text-cyan-500',
  },
  {
    id: 'policymaker',
    label: 'policymaker',
    icon: 'hugeicons:policy',
    iconClass: 'text-emerald-500',
  },
  {
    id: 'management',
    label: 'management',
    icon: 'hugeicons:dashboard-square-01',
    iconClass: 'text-blue-500',
  },
  {
    id: 'impersonator',
    label: 'impersonator',
    icon: 'hugeicons:user-switch',
    iconClass: 'text-pink-500',
  },
  {
    id: 'other',
    label: 'Custom tags',
    icon: 'hugeicons:tags',
    iconClass: 'text-muted-foreground',
  },
  {
    id: 'none',
    label: 'No tags (AMQP only)',
    icon: 'hugeicons:user-block-01',
    iconClass: 'text-muted-foreground',
  },
];

export const RABBIT_ADMINISTRATOR_TAG = 'administrator';

export const RABBIT_USER_LIMIT_OPTIONS: {
  name: 'max-connections' | 'max-channels';
  description: string;
}[] = [
  {
    name: 'max-connections',
    description: 'Connections this user may open at the same time.',
  },
  {
    name: 'max-channels',
    description: 'Channels this user may open across all its connections.',
  },
];

/** Regex that grants everything, the Management UI default. */
export const RABBIT_FULL_ACCESS_PATTERN = '.*';

export const RABBIT_PERMISSION_DESCRIPTIONS = {
  configure: 'Create or delete queues and exchanges whose name matches.',
  write: 'Publish to exchanges, bind queues to exchanges whose name matches.',
  read: 'Consume from queues, bind from exchanges whose name matches.',
} as const;
