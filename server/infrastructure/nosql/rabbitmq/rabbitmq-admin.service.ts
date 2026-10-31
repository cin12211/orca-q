import type {
  RabbitConnectionDetail,
  RabbitDeprecatedFeature,
  RabbitFeatureFlag,
  RabbitFeatureFlagsSnapshot,
  RabbitLimitRow,
  RabbitLimitsSnapshot,
  RabbitPoliciesSnapshot,
  RabbitPolicy,
  RabbitPolicyKind,
  RabbitVhostInput,
  RabbitVhostLimitName,
  RabbitVhostSummary,
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
  asArray,
  asNullableNumber,
  asNumber,
  asRecord,
  asString,
  asTagList,
  mapChannel,
  mapConnection,
  mapMessageRates,
  type RawRecord,
} from './rabbitmq-mappers';

const POLICY_PATH: Record<RabbitPolicyKind, string> = {
  user: 'policies',
  operator: 'operator-policies',
};

/** Read a list, or return null when this user may not see it. */
async function readOptional(client: RabbitManagementClient, path: string) {
  try {
    return await client.get<RawRecord[]>(path);
  } catch (error) {
    if (isRabbitPermissionError(error)) return null;
    throw error;
  }
}

async function exists(client: RabbitManagementClient, path: string) {
  try {
    await client.get<RawRecord>(path);
    return true;
  } catch (error) {
    if (error instanceof RabbitNotFoundError) return false;
    throw error;
  }
}

function mapVhost(raw: RawRecord): RabbitVhostSummary {
  const metadata = asRecord(raw.metadata);
  const clusterState = asRecord(raw.cluster_state);

  return {
    name: asString(raw.name),
    description: asString(raw.description ?? metadata.description),
    tags: asTagList(raw.tags ?? metadata.tags),
    defaultQueueType: asString(
      raw.default_queue_type ?? metadata.default_queue_type,
      'classic'
    ),
    isTracing: Boolean(raw.tracing),
    isProtectedFromDeletion: Boolean(
      raw.protected_from_deletion ?? metadata.protected_from_deletion
    ),
    clusterState: Object.fromEntries(
      Object.entries(clusterState).map(([node, state]) => [node, String(state)])
    ),
    messages: asNumber(raw.messages),
    messagesReady: asNumber(raw.messages_ready),
    messagesUnacknowledged: asNumber(raw.messages_unacknowledged),
    rates: mapMessageRates(raw.message_stats),
    receiveRate: asNullableNumber(asRecord(raw.recv_oct_details).rate),
    sendRate: asNullableNumber(asRecord(raw.send_oct_details).rate),
  };
}

function mapPolicy(raw: RawRecord, kind: RabbitPolicyKind): RabbitPolicy {
  return {
    kind,
    vhost: asString(raw.vhost),
    name: asString(raw.name),
    pattern: asString(raw.pattern),
    applyTo: asString(raw['apply-to'], 'all'),
    priority: asNumber(raw.priority),
    definition: asRecord(raw.definition),
  };
}

const mapLimitRow = (
  raw: RawRecord,
  key: 'vhost' | 'user'
): RabbitLimitRow => ({
  target: asString(raw[key]),
  limits: Object.fromEntries(
    Object.entries(asRecord(raw.value)).map(([name, value]) => [
      name,
      asNumber(value),
    ])
  ),
});

function mapFeatureFlag(raw: RawRecord): RabbitFeatureFlag {
  return {
    name: asString(raw.name),
    state: asString(raw.state, 'unavailable'),
    stability: asString(raw.stability, 'stable'),
    description: asString(raw.desc),
    providedBy: asString(raw.provided_by),
    docUrl: asString(raw.doc_url) || null,
  };
}

function mapDeprecatedFeature(
  raw: RawRecord,
  used: Set<string>
): RabbitDeprecatedFeature {
  const name = asString(raw.name);

  return {
    name,
    phase: asString(raw.deprecation_phase),
    description: asString(raw.desc),
    providedBy: asString(raw.provided_by),
    docUrl: asString(raw.doc_url) || null,
    isUsed: used.has(name),
  };
}

const sortByName = <T extends { name: string }>(items: T[]) =>
  items.sort((left, right) => left.name.localeCompare(right.name));

// ---------------------------------------------------------------- reads

export async function listRabbitVhostDetails(
  input: BrokerConnectionInput
): Promise<RabbitVhostSummary[]> {
  return withRabbitManagement(input, async client =>
    sortByName(
      (await client.get<RawRecord[]>(rabbitApiPath('vhosts'))).map(mapVhost)
    )
  );
}

export async function listRabbitPolicies(
  input: BrokerConnectionInput
): Promise<RabbitPoliciesSnapshot> {
  return withRabbitManagement(input, async client => {
    const [user, operator] = await Promise.all([
      readOptional(client, rabbitApiPath(POLICY_PATH.user)),
      readOptional(client, rabbitApiPath(POLICY_PATH.operator)),
    ]);

    return {
      policies: [
        ...(user ?? []).map(raw => mapPolicy(raw, 'user')),
        ...(operator ?? []).map(raw => mapPolicy(raw, 'operator')),
      ].sort(
        (left, right) =>
          left.vhost.localeCompare(right.vhost) ||
          right.priority - left.priority ||
          left.name.localeCompare(right.name)
      ),
      unavailableReason:
        user && operator
          ? null
          : 'Some policies are hidden: reading operator policies needs the "administrator" tag, user policies need "policymaker" or "management" access to the vhost.',
    };
  });
}

export async function getRabbitLimits(
  input: BrokerConnectionInput
): Promise<RabbitLimitsSnapshot> {
  return withRabbitTaggedAction(input, 'Reading limits', async client => {
    const [vhostLimits, userLimits] = await Promise.all([
      client.get<RawRecord[]>(rabbitApiPath('vhost-limits')),
      client.get<RawRecord[]>(rabbitApiPath('user-limits')),
    ]);

    return {
      vhostLimits: vhostLimits.map(raw => mapLimitRow(raw, 'vhost')),
      userLimits: userLimits.map(raw => mapLimitRow(raw, 'user')),
    };
  });
}

export async function getRabbitFeatureFlags(
  input: BrokerConnectionInput
): Promise<RabbitFeatureFlagsSnapshot> {
  return withRabbitTaggedAction(
    input,
    'Reading feature flags',
    async client => {
      const [flags, deprecated, used] = await Promise.all([
        client.get<RawRecord[]>(rabbitApiPath('feature-flags')),
        // Deprecated features arrived in RabbitMQ 3.13.
        client
          .get<RawRecord[]>(rabbitApiPath('deprecated-features'))
          .catch((error: unknown) => {
            if (error instanceof RabbitNotFoundError) return [];
            throw error;
          }),
        client
          .get<RawRecord[]>(rabbitApiPath('deprecated-features', 'used'))
          .catch((error: unknown) => {
            if (error instanceof RabbitNotFoundError) return [];
            throw error;
          }),
      ]);
      const usedNames = new Set(asArray(used).map(raw => asString(raw.name)));

      return {
        flags: sortByName(asArray(flags).map(mapFeatureFlag)),
        deprecated: sortByName(
          asArray(deprecated).map(raw => mapDeprecatedFeature(raw, usedNames))
        ),
      };
    }
  );
}

export async function getRabbitConnectionDetail(
  input: BrokerConnectionInput,
  connectionName: string
): Promise<RabbitConnectionDetail> {
  return withRabbitManagement(input, async client => {
    const [raw, channels] = await Promise.all([
      client.get<RawRecord>(rabbitApiPath('connections', connectionName)),
      client.get<RawRecord[]>(
        rabbitApiPath('connections', connectionName, 'channels')
      ),
    ]);
    const isTls = Boolean(raw.ssl);

    return {
      ...mapConnection(raw),
      authMechanism: asString(raw.auth_mechanism),
      heartbeatSeconds: asNullableNumber(raw.timeout),
      frameMax: asNullableNumber(raw.frame_max),
      channelMax: asNullableNumber(raw.channel_max),
      tls: isTls
        ? {
            protocol: asString(raw.ssl_protocol),
            cipher: asString(raw.ssl_cipher),
            peerCertificateSubject: asString(raw.peer_cert_subject) || null,
            peerCertificateIssuer: asString(raw.peer_cert_issuer) || null,
            peerCertificateValidity: asString(raw.peer_cert_validity) || null,
          }
        : null,
      clientProperties: asRecord(raw.client_properties),
      channelList: asArray(channels).map(mapChannel),
    };
  });
}

// ---------------------------------------------------------------- changes

export async function saveRabbitVhost(
  input: BrokerConnectionInput,
  vhost: RabbitVhostInput,
  isNew: boolean
) {
  return withRabbitTaggedAction(
    input,
    'Changing virtual hosts',
    async client => {
      const path = rabbitApiPath('vhosts', vhost.name);

      if (isNew && (await exists(client, path))) {
        throw new BrokerConnectionError(
          `Virtual host "${vhost.name}" already exists.`,
          undefined,
          'RABBITMQ_VHOST_EXISTS'
        );
      }

      await client.put(path, {
        description: vhost.description,
        tags: vhost.tags.join(','),
        default_queue_type: vhost.defaultQueueType,
        tracing: vhost.isTracing,
      });

      return { saved: true };
    }
  );
}

export async function deleteRabbitVhost(
  input: BrokerConnectionInput,
  vhostName: string
) {
  return withRabbitTaggedAction(
    input,
    'Deleting virtual hosts',
    async client => {
      await client.delete(rabbitApiPath('vhosts', vhostName));
      return { deleted: true };
    }
  );
}

/** Save a policy; when it was renamed, the old one is removed afterwards. */
export async function saveRabbitPolicy(
  input: BrokerConnectionInput,
  policy: RabbitPolicy,
  previousName?: string
) {
  const requiredTag =
    policy.kind === 'operator' ? 'administrator' : 'policymaker';

  return withRabbitTaggedAction(
    input,
    'Changing policies',
    async client => {
      const kindPath = POLICY_PATH[policy.kind];

      await client.put(rabbitApiPath(kindPath, policy.vhost, policy.name), {
        pattern: policy.pattern,
        'apply-to': policy.applyTo,
        priority: policy.priority,
        definition: policy.definition,
      });

      if (previousName && previousName !== policy.name) {
        await client.delete(
          rabbitApiPath(kindPath, policy.vhost, previousName)
        );
      }

      return { saved: true };
    },
    requiredTag
  );
}

export async function deleteRabbitPolicy(
  input: BrokerConnectionInput,
  target: { kind: RabbitPolicyKind; vhost: string; name: string }
) {
  return withRabbitTaggedAction(
    input,
    'Deleting policies',
    async client => {
      await client.delete(
        rabbitApiPath(POLICY_PATH[target.kind], target.vhost, target.name)
      );
      return { deleted: true };
    },
    target.kind === 'operator' ? 'administrator' : 'policymaker'
  );
}

export async function setRabbitVhostLimit(
  input: BrokerConnectionInput,
  vhost: string,
  limit: { name: RabbitVhostLimitName; value: number }
) {
  return withRabbitTaggedAction(input, 'Changing limits', async client => {
    await client.put(rabbitApiPath('vhost-limits', vhost, limit.name), {
      value: limit.value,
    });
    return { updated: true };
  });
}

export async function clearRabbitVhostLimit(
  input: BrokerConnectionInput,
  vhost: string,
  limitName: RabbitVhostLimitName
) {
  return withRabbitTaggedAction(input, 'Changing limits', async client => {
    await client.delete(rabbitApiPath('vhost-limits', vhost, limitName));
    return { cleared: true };
  });
}

/** Enabling a feature flag cannot be undone. */
export async function enableRabbitFeatureFlag(
  input: BrokerConnectionInput,
  flagName: string
) {
  return withRabbitTaggedAction(
    input,
    'Enabling feature flags',
    async client => {
      await client.put(rabbitApiPath('feature-flags', flagName, 'enable'), {});
      return { enabled: true };
    }
  );
}

export async function closeRabbitConnection(
  input: BrokerConnectionInput,
  connectionName: string,
  reason: string
) {
  return withRabbitTaggedAction(input, 'Closing connections', async client => {
    await client.delete(rabbitApiPath('connections', connectionName), {
      'x-reason': reason,
    });
    return { closed: true };
  });
}

export async function setRabbitClusterName(
  input: BrokerConnectionInput,
  name: string
) {
  return withRabbitTaggedAction(input, 'Renaming the cluster', async client => {
    await client.put(rabbitApiPath('cluster-name'), { name });
    return { renamed: true };
  });
}
