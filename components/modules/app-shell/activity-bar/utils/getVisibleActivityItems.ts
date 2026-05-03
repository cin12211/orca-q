import type { ConnectionActivityItem } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  ACTIVITY_ITEM_MAP,
  AGENT_HIDDEN_CONNECTION_TYPES,
  USERS_ROLES_HIDDEN_CONNECTION_TYPES,
} from '../constants/activityBarVisibility';

export const getVisibleActivityItems = (
  items: ConnectionActivityItem[],
  connectionType?: DatabaseClientType
) =>
  items
    .filter(item => {
      if (
        item === 'Agent' &&
        connectionType &&
        AGENT_HIDDEN_CONNECTION_TYPES.has(connectionType)
      ) {
        return false;
      }

      if (
        item === 'UsersRoles' &&
        connectionType &&
        USERS_ROLES_HIDDEN_CONNECTION_TYPES.has(connectionType)
      ) {
        return false;
      }

      return true;
    })
    .map(item => ACTIVITY_ITEM_MAP[item]);
