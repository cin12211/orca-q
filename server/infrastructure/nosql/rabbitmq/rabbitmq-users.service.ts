import type {
  RabbitCreateUserInput,
  RabbitCurrentUser,
  RabbitTopicPermission,
  RabbitUpdateUserInput,
  RabbitUserDetail,
  RabbitUserLimitName,
  RabbitUserPermission,
  RabbitUsersSnapshot,
  RabbitUserSummary,
} from '~/core/types/rabbitmq.types';
import {
  BrokerConnectionError,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  isRabbitPermissionError,
  rabbitApiPath,
  RabbitNotFoundError,
  withRabbitManagement,
  withRabbitTaggedAction,
  type RabbitManagementClient,
} from './rabbitmq-management.client';
import {
  asNumber,
  asRecord,
  asString,
  asTagList,
  type RawRecord,
} from './rabbitmq-mappers';

const USERS_UNAVAILABLE_REASON =
  'Listing users needs the "administrator" tag on this RabbitMQ user.';

const toTags = asTagList;

const mapLimits = (value: unknown) =>
  Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, limit]) => [
      key,
      asNumber(limit),
    ])
  );

const mapPermission = (raw: RawRecord): RabbitUserPermission => ({
  vhost: asString(raw.vhost),
  configure: asString(raw.configure),
  write: asString(raw.write),
  read: asString(raw.read),
});

const mapTopicPermission = (raw: RawRecord): RabbitTopicPermission => ({
  vhost: asString(raw.vhost),
  exchange: asString(raw.exchange),
  write: asString(raw.write),
  read: asString(raw.read),
});

function mapUser(raw: RawRecord, vhosts: string[]): RabbitUserSummary {
  return {
    name: asString(raw.name),
    tags: toTags(raw.tags),
    hasPassword: Boolean(raw.has_password ?? raw.password_hash),
    vhosts: [...vhosts].sort(),
    limits: mapLimits(raw.limits),
  };
}

const isPermissionError = isRabbitPermissionError;

const ADMINISTRATOR_TAG = 'administrator';

async function readCurrentUser(
  client: RabbitManagementClient
): Promise<RabbitCurrentUser> {
  const whoami = await client.get<RawRecord>(rabbitApiPath('whoami'));
  return { name: asString(whoami.name), tags: toTags(whoami.tags) };
}

const withAdminRabbitManagement = withRabbitTaggedAction;

export async function listRabbitUsers(
  input: BrokerConnectionInput
): Promise<RabbitUsersSnapshot> {
  return withRabbitManagement(input, async client => {
    const currentUser = await readCurrentUser(client);

    try {
      const [users, permissions] = await Promise.all([
        client.get<RawRecord[]>(rabbitApiPath('users')),
        client.get<RawRecord[]>(rabbitApiPath('permissions')),
      ]);
      const vhostsByUser = new Map<string, string[]>();

      for (const raw of permissions) {
        const user = asString(raw.user);
        vhostsByUser.set(user, [
          ...(vhostsByUser.get(user) ?? []),
          asString(raw.vhost),
        ]);
      }

      return {
        currentUser,
        users: users
          .map(user =>
            mapUser(user, vhostsByUser.get(asString(user.name)) ?? [])
          )
          .sort((left, right) => left.name.localeCompare(right.name)),
        unavailableReason: null,
      };
    } catch (error) {
      if (!isPermissionError(error)) throw error;

      return {
        currentUser,
        users: [],
        unavailableReason: USERS_UNAVAILABLE_REASON,
      };
    }
  });
}

export async function getRabbitUserDetail(
  input: BrokerConnectionInput,
  userName: string
): Promise<RabbitUserDetail> {
  return withRabbitManagement(input, async client => {
    try {
      const [currentUser, user, permissions, topicPermissions] =
        await Promise.all([
          readCurrentUser(client),
          client.get<RawRecord>(rabbitApiPath('users', userName)),
          client.get<RawRecord[]>(
            rabbitApiPath('users', userName, 'permissions')
          ),
          client.get<RawRecord[]>(
            rabbitApiPath('users', userName, 'topic-permissions')
          ),
        ]);
      const mappedPermissions = permissions
        .map(mapPermission)
        .sort((left, right) => left.vhost.localeCompare(right.vhost));

      return {
        ...mapUser(
          user,
          mappedPermissions.map(permission => permission.vhost)
        ),
        permissions: mappedPermissions,
        topicPermissions: topicPermissions.map(mapTopicPermission),
        currentUser,
      };
    } catch (error) {
      if (!isPermissionError(error)) throw error;
      throw new BrokerConnectionError(
        USERS_UNAVAILABLE_REASON,
        undefined,
        'RABBITMQ_USERS_FORBIDDEN'
      );
    }
  });
}

/**
 * Create a user (refusing to overwrite an existing one) and optionally grant
 * it permissions on one vhost. Needs the `administrator` tag.
 */
export async function createRabbitUser(
  input: BrokerConnectionInput,
  user: RabbitCreateUserInput
) {
  return withAdminRabbitManagement(input, 'Creating users', async client => {
    const existing = await client
      .get<RawRecord>(rabbitApiPath('users', user.name))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'RabbitNotFoundError') {
          return null;
        }
        throw error;
      });

    if (existing) {
      throw new BrokerConnectionError(
        `User "${user.name}" already exists.`,
        'Pick another name, or edit the existing user.',
        'RABBITMQ_USER_EXISTS'
      );
    }

    await client.put(rabbitApiPath('users', user.name), {
      password: user.password,
      tags: user.tags.join(','),
    });

    if (user.permission) {
      await client.put(
        rabbitApiPath('permissions', user.permission.vhost, user.name),
        {
          configure: user.permission.configure,
          write: user.permission.write,
          read: user.permission.read,
        }
      );
    }

    return { created: true };
  });
}

/**
 * RabbitMQ 4 no longer returns `password_hash` from `/api/users/{name}`; only
 * the definitions export carries it.
 */
async function readPasswordHash(
  client: RabbitManagementClient,
  userName: string
) {
  const definitions = await client.get<RawRecord>(rabbitApiPath('definitions'));
  const users = Array.isArray(definitions.users)
    ? (definitions.users as RawRecord[])
    : [];
  const user = users.find(item => asString(item.name) === userName);

  if (!user) throw new RabbitNotFoundError(rabbitApiPath('users', userName));

  return {
    password_hash: asString(user.password_hash),
    hashing_algorithm: asString(user.hashing_algorithm),
  };
}

/**
 * Change a user's tags and optionally its password. RabbitMQ replaces the
 * whole user on PUT, so the current password hash is sent back when the
 * password does not change.
 */
export async function updateRabbitUser(
  input: BrokerConnectionInput,
  user: RabbitUpdateUserInput
) {
  return withAdminRabbitManagement(input, 'Editing users', async client => {
    const currentUser = await readCurrentUser(client);

    if (
      currentUser.name === user.name &&
      !user.tags.includes(ADMINISTRATOR_TAG)
    ) {
      throw new BrokerConnectionError(
        'You cannot remove the "administrator" tag from the user OrcaQ is connected as.',
        'Connect as another administrator to change this user.',
        'RABBITMQ_SELF_LOCKOUT'
      );
    }

    const credentials = user.password
      ? { password: user.password }
      : user.shouldRemovePassword
        ? { password_hash: '' }
        : await readPasswordHash(client, user.name);

    await client.put(rabbitApiPath('users', user.name), {
      ...credentials,
      tags: user.tags.join(','),
    });

    return { updated: true };
  });
}

export async function deleteRabbitUser(
  input: BrokerConnectionInput,
  userName: string
) {
  return withAdminRabbitManagement(input, 'Deleting users', async client => {
    const currentUser = await readCurrentUser(client);

    if (currentUser.name === userName) {
      throw new BrokerConnectionError(
        'You cannot delete the user OrcaQ is connected as.',
        'Connect as another administrator to delete this user.',
        'RABBITMQ_SELF_LOCKOUT'
      );
    }

    await client.delete(rabbitApiPath('users', userName));
    return { deleted: true };
  });
}

export async function setRabbitPermission(
  input: BrokerConnectionInput,
  userName: string,
  permission: RabbitUserPermission
) {
  return withAdminRabbitManagement(
    input,
    'Changing permissions',
    async client => {
      await client.put(
        rabbitApiPath('permissions', permission.vhost, userName),
        {
          configure: permission.configure,
          write: permission.write,
          read: permission.read,
        }
      );
      return { updated: true };
    }
  );
}

export async function clearRabbitPermission(
  input: BrokerConnectionInput,
  userName: string,
  vhost: string
) {
  return withAdminRabbitManagement(
    input,
    'Changing permissions',
    async client => {
      await client.delete(rabbitApiPath('permissions', vhost, userName));
      return { cleared: true };
    }
  );
}

export async function setRabbitTopicPermission(
  input: BrokerConnectionInput,
  userName: string,
  permission: RabbitTopicPermission
) {
  return withAdminRabbitManagement(
    input,
    'Changing topic permissions',
    async client => {
      await client.put(
        rabbitApiPath('topic-permissions', permission.vhost, userName),
        {
          exchange: permission.exchange,
          write: permission.write,
          read: permission.read,
        }
      );
      return { updated: true };
    }
  );
}

/**
 * The HTTP API only clears every topic permission of a user on a vhost, so
 * the other exchanges on that vhost are written back afterwards.
 */
export async function clearRabbitTopicPermission(
  input: BrokerConnectionInput,
  userName: string,
  target: { vhost: string; exchange: string }
) {
  return withAdminRabbitManagement(
    input,
    'Changing topic permissions',
    async client => {
      const path = rabbitApiPath('topic-permissions', target.vhost, userName);
      const current = await client.get<RawRecord[]>(path);
      const kept = current
        .map(mapTopicPermission)
        .filter(permission => permission.exchange !== target.exchange);

      await client.delete(path);

      for (const permission of kept) {
        await client.put(path, {
          exchange: permission.exchange,
          write: permission.write,
          read: permission.read,
        });
      }

      return { cleared: true };
    }
  );
}

export async function setRabbitUserLimit(
  input: BrokerConnectionInput,
  userName: string,
  limit: { name: RabbitUserLimitName; value: number }
) {
  return withAdminRabbitManagement(input, 'Changing limits', async client => {
    await client.put(rabbitApiPath('user-limits', userName, limit.name), {
      value: limit.value,
    });
    return { updated: true };
  });
}

export async function clearRabbitUserLimit(
  input: BrokerConnectionInput,
  userName: string,
  limitName: RabbitUserLimitName
) {
  return withAdminRabbitManagement(input, 'Changing limits', async client => {
    await client.delete(rabbitApiPath('user-limits', userName, limitName));
    return { cleared: true };
  });
}
