import { RABBIT_USER_GROUPS, type RabbitUserGroupId } from '../constants';

const BUILT_IN_GROUP_IDS = RABBIT_USER_GROUPS.map(group => group.id).filter(
  id => id !== 'other' && id !== 'none'
);

/** The RabbitMQ tag group a user is listed under in the sidebar. */
export function getRabbitUserGroupId(tags: string[]): RabbitUserGroupId {
  const builtIn = BUILT_IN_GROUP_IDS.find(id => tags.includes(id));
  if (builtIn) return builtIn;

  return tags.length ? 'other' : 'none';
}

/**
 * Same item icons and colours as the Postgres Users & Roles tree:
 * administrators read like superusers (yellow), users who can log in with a
 * password are blue, users without a password (certificate / external auth)
 * are purple.
 */
export function getRabbitUserAppearance(user: {
  tags: string[];
  hasPassword: boolean;
}) {
  const isAdministrator = user.tags.includes('administrator');

  return {
    icon: user.hasPassword ? 'hugeicons:user-circle' : 'hugeicons:user-lock-01',
    iconClass: isAdministrator
      ? 'text-yellow-500'
      : user.hasPassword
        ? 'text-blue-400'
        : 'text-purple-400',
  };
}
