import { getBrokerConnectionPayload } from '~/core/helpers/broker-connection';
import type { Connection } from '~/core/stores';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import type {
  RabbitConnectionDetail,
  RabbitConnectionsSnapshot,
  RabbitCreateUserInput,
  RabbitExchangeDetail,
  RabbitExchangeSummary,
  RabbitFeatureFlagsSnapshot,
  RabbitLimitsSnapshot,
  RabbitOverview,
  RabbitPoliciesSnapshot,
  RabbitPolicy,
  RabbitPolicyKind,
  RabbitPublishInput,
  RabbitPublishResult,
  RabbitQueueDetail,
  RabbitQueuePage,
  RabbitTopicPermission,
  RabbitUpdateUserInput,
  RabbitUserDetail,
  RabbitUserLimitName,
  RabbitUserPermission,
  RabbitUsersSnapshot,
  RabbitVhostInput,
  RabbitVhostLimitName,
  RabbitVhostSummary,
} from '~/core/types/rabbitmq.types';

const post = <T>(
  path: string,
  connection: Connection,
  body: Record<string, unknown> = {}
) =>
  $fetch<T>(`/api/rabbitmq/${path}`, {
    method: 'POST',
    body: { connection: getBrokerConnectionPayload(connection), ...body },
  });

export const rabbitmqService = {
  overview: (connection: Connection) =>
    post<RabbitOverview>('overview', connection),
  vhosts: (connection: Connection) => post<string[]>('vhosts', connection),
  queues: (
    connection: Connection,
    options: {
      vhost?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    }
  ) => post<RabbitQueuePage>('queues', connection, options),
  queue: (connection: Connection, vhost: string, queueName: string) =>
    post<RabbitQueueDetail>('queue', connection, { vhost, queueName }),
  exchanges: (connection: Connection, vhost?: string) =>
    post<RabbitExchangeSummary[]>('exchanges', connection, { vhost }),
  exchange: (connection: Connection, vhost: string, exchangeName: string) =>
    post<RabbitExchangeDetail>('exchange', connection, { vhost, exchangeName }),
  connections: (connection: Connection, vhost?: string) =>
    post<RabbitConnectionsSnapshot>('connections', connection, { vhost }),
  peek: (
    connection: Connection,
    vhost: string,
    queueName: string,
    count: number
  ) => post<BrokerMessage[]>('peek', connection, { vhost, queueName, count }),
  users: (connection: Connection) =>
    post<RabbitUsersSnapshot>('users', connection),
  user: (connection: Connection, userName: string) =>
    post<RabbitUserDetail>('user', connection, { userName }),
  createUser: (connection: Connection, user: RabbitCreateUserInput) =>
    post<{ created: boolean }>('user-create', connection, { ...user }),
  updateUser: (connection: Connection, user: RabbitUpdateUserInput) =>
    post<{ updated: boolean }>('user-update', connection, { ...user }),
  deleteUser: (connection: Connection, userName: string) =>
    post<{ deleted: boolean }>('user-delete', connection, { userName }),
  setPermission: (
    connection: Connection,
    userName: string,
    permission: RabbitUserPermission
  ) =>
    post<{ updated: boolean }>('user-permission-set', connection, {
      userName,
      permission,
    }),
  clearPermission: (connection: Connection, userName: string, vhost: string) =>
    post<{ cleared: boolean }>('user-permission-clear', connection, {
      userName,
      vhost,
    }),
  setTopicPermission: (
    connection: Connection,
    userName: string,
    permission: RabbitTopicPermission
  ) =>
    post<{ updated: boolean }>('user-topic-permission-set', connection, {
      userName,
      permission,
    }),
  clearTopicPermission: (
    connection: Connection,
    userName: string,
    target: { vhost: string; exchange: string }
  ) =>
    post<{ cleared: boolean }>('user-topic-permission-clear', connection, {
      userName,
      ...target,
    }),
  setUserLimit: (
    connection: Connection,
    userName: string,
    limit: { name: RabbitUserLimitName; value: number }
  ) =>
    post<{ updated: boolean }>('user-limit-set', connection, {
      userName,
      limit,
    }),
  clearUserLimit: (
    connection: Connection,
    userName: string,
    limitName: RabbitUserLimitName
  ) =>
    post<{ cleared: boolean }>('user-limit-clear', connection, {
      userName,
      limitName,
    }),
  importDefinitions: (
    connection: Connection,
    definitions: Record<string, unknown>,
    vhost?: string
  ) =>
    post<{ imported: boolean }>('definitions-import', connection, {
      definitions,
      vhost,
    }),
  vhostDetails: (connection: Connection) =>
    post<RabbitVhostSummary[]>('vhost-list', connection),
  saveVhost: (
    connection: Connection,
    vhost: RabbitVhostInput,
    isNew: boolean
  ) => post<{ saved: boolean }>('vhost-save', connection, { vhost, isNew }),
  deleteVhost: (connection: Connection, vhost: string) =>
    post<{ deleted: boolean }>('vhost-delete', connection, { vhost }),
  policies: (connection: Connection) =>
    post<RabbitPoliciesSnapshot>('policies', connection),
  savePolicy: (
    connection: Connection,
    policy: RabbitPolicy,
    previousName?: string
  ) =>
    post<{ saved: boolean }>('policy-save', connection, {
      policy,
      previousName,
    }),
  deletePolicy: (
    connection: Connection,
    target: { kind: RabbitPolicyKind; vhost: string; name: string }
  ) => post<{ deleted: boolean }>('policy-delete', connection, { ...target }),
  limits: (connection: Connection) =>
    post<RabbitLimitsSnapshot>('limits', connection),
  setVhostLimit: (
    connection: Connection,
    vhost: string,
    limit: { name: RabbitVhostLimitName; value: number }
  ) =>
    post<{ updated: boolean }>('vhost-limit-set', connection, { vhost, limit }),
  clearVhostLimit: (
    connection: Connection,
    vhost: string,
    limitName: RabbitVhostLimitName
  ) =>
    post<{ cleared: boolean }>('vhost-limit-clear', connection, {
      vhost,
      limitName,
    }),
  featureFlags: (connection: Connection) =>
    post<RabbitFeatureFlagsSnapshot>('feature-flags', connection),
  enableFeatureFlag: (connection: Connection, name: string) =>
    post<{ enabled: boolean }>('feature-flag-enable', connection, { name }),
  connectionDetail: (connection: Connection, connectionName: string) =>
    post<RabbitConnectionDetail>('connection', connection, { connectionName }),
  closeConnection: (
    connection: Connection,
    connectionName: string,
    reason: string
  ) =>
    post<{ closed: boolean }>('connection-close', connection, {
      connectionName,
      reason,
    }),
  renameCluster: (connection: Connection, name: string) =>
    post<{ renamed: boolean }>('cluster-name', connection, { name }),
  publish: (connection: Connection, message: RabbitPublishInput) =>
    post<RabbitPublishResult>('publish', connection, { ...message }),
};
