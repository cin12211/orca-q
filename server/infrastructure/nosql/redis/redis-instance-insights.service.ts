import type {
  InstanceActionResponse,
  RedisBigKeyMetric,
  RedisClientSummary,
  RedisCommandStat,
  RedisConfigEntry,
  RedisInstanceInsights,
  RedisKeyTypeDistribution,
  RedisPrefixMetric,
  RedisSlowlogEntry,
} from '~/core/types';
import type { RedisRuntimeInput } from './redis.client';
import { createRedisRuntimeClient } from './redis.client';

const CONFIG_KEYS = [
  'maxmemory',
  'maxmemory-policy',
  'appendonly',
  'save',
  'timeout',
  'tcp-keepalive',
  'latency-monitor-threshold',
  'slowlog-log-slower-than',
  'slowlog-max-len',
  'databases',
  'notify-keyspace-events',
];

const parseInfoBlock = (raw: string) =>
  raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes(':'))
    .reduce<Record<string, string>>((acc, line) => {
      const [key, ...rest] = line.split(':');
      acc[key] = rest.join(':');
      return acc;
    }, {});

const parseInlineMap = (raw?: string) => {
  if (!raw) {
    return {} as Record<string, string>;
  }

  return raw.split(',').reduce<Record<string, string>>((acc, token) => {
    const [key, value] = token.split('=');
    if (key) {
      acc[key] = value ?? '';
    }

    return acc;
  }, {});
};

const toNumber = (value?: string) => {
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInteger = (value?: string) => Math.trunc(toNumber(value));

const formatBytes = (bytes: number) => {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const formatted = bytes / 1024 ** exponent;
  return `${formatted.toFixed(formatted >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const parseTimestamp = (seconds?: string) => {
  const parsed = toInteger(seconds);
  if (!parsed) {
    return null;
  }

  return new Date(parsed * 1000).toISOString();
};

const getPrefixFromKey = (key: string) => {
  const segments = key.split(':').filter(Boolean);
  return segments.length > 1 ? `${segments[0]}:*` : key;
};

const safeCommand = async <T>(
  client: Awaited<ReturnType<typeof createRedisRuntimeClient>>['client'],
  args: string[],
  fallback: T
) => {
  try {
    return (await client.sendCommand(args)) as T;
  } catch {
    return fallback;
  }
};

const scanKeys = async (
  client: Awaited<ReturnType<typeof createRedisRuntimeClient>>['client'],
  limit = 250
) => {
  const keys: string[] = [];
  const seen = new Set<string>();
  let cursor = '0';

  do {
    const result = await client.scan(cursor, {
      MATCH: '*',
      COUNT: Math.min(limit, 100),
    });
    cursor = `${result.cursor}`;

    for (const key of result.keys) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }

      if (keys.length >= limit) {
        break;
      }
    }
  } while (cursor !== '0' && keys.length < limit);

  return keys;
};

const parseSlowlog = (entries: unknown[]): RedisSlowlogEntry[] =>
  entries
    .map(entry => {
      const value = entry as Array<unknown>;
      const commandParts = Array.isArray(value?.[3])
        ? (value[3] as Array<unknown>).map(part => String(part))
        : [];

      return {
        id: String(value?.[0] ?? ''),
        timestamp: parseTimestamp(String(value?.[1] ?? '0')) || '',
        durationMicros: toInteger(String(value?.[2] ?? '0')),
        command: commandParts.join(' '),
        clientAddr: value?.[4] ? String(value[4]) : null,
        clientName: value?.[5] ? String(value[5]) : null,
      } satisfies RedisSlowlogEntry;
    })
    .filter(entry => entry.id);

const parseClientList = (raw: string): RedisClientSummary[] =>
  raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const fields = line
        .split(' ')
        .reduce<Record<string, string>>((acc, token) => {
          const separatorIndex = token.indexOf('=');
          if (separatorIndex > 0) {
            const key = token.slice(0, separatorIndex);
            const value = token.slice(separatorIndex + 1);
            acc[key] = value;
          }

          return acc;
        }, {});

      return {
        id: fields.id || '',
        addr: fields.addr || 'unknown',
        name: fields.name || 'anonymous',
        ageSeconds: toInteger(fields.age),
        idleSeconds: toInteger(fields.idle),
        db: toInteger(fields.db),
        cmd: fields.cmd || 'unknown',
        flags: fields.flags || '',
      } satisfies RedisClientSummary;
    })
    .filter(client => client.id);

const parseCommandStats = (
  commandstats: Record<string, string>
): RedisCommandStat[] =>
  Object.entries(commandstats)
    .filter(([key]) => key.startsWith('cmdstat_'))
    .map(([key, value]) => {
      const parsed = parseInlineMap(value);

      return {
        command: key.replace('cmdstat_', ''),
        calls: toInteger(parsed.calls),
        usecPerCall: toNumber(parsed.usec_per_call),
      } satisfies RedisCommandStat;
    })
    .sort((left, right) => right.calls - left.calls)
    .slice(0, 10);

const parseKeyspace = (keyspaceInfo: Record<string, string>) =>
  Object.entries(keyspaceInfo)
    .filter(([key]) => key.startsWith('db'))
    .map(([database, value]) => {
      const parsed = parseInlineMap(value);

      return {
        database,
        keyCount: toInteger(parsed.keys),
        expires: toInteger(parsed.expires),
        avgTtl: toInteger(parsed.avg_ttl),
      };
    })
    .sort((left, right) =>
      left.database.localeCompare(right.database, undefined, { numeric: true })
    );

const parseReplicationReplicas = (replication: Record<string, string>) =>
  Object.entries(replication)
    .filter(([key]) => key.startsWith('slave'))
    .map(([id, value]) => {
      const parsed = parseInlineMap(value);
      return {
        id,
        addr: parsed.ip ? `${parsed.ip}:${parsed.port || '6379'}` : 'unknown',
        state: parsed.state || 'unknown',
        lag: parsed.lag ? toInteger(parsed.lag) : null,
        offset: parsed.offset || null,
      };
    });

const parseConfigEntry = (name: string, raw: unknown): RedisConfigEntry => {
  if (Array.isArray(raw)) {
    const index = raw.findIndex(entry => entry === name);
    return {
      name,
      value: index >= 0 ? String(raw[index + 1] ?? '') : String(raw[1] ?? ''),
    };
  }

  if (raw && typeof raw === 'object') {
    const value = (raw as Record<string, unknown>)[name];
    return {
      name,
      value: value === undefined ? '' : String(value),
    };
  }

  return {
    name,
    value: raw === undefined || raw === null ? '' : String(raw),
  };
};

export async function getRedisInstanceInsights(
  input: RedisRuntimeInput & { databaseIndex?: number }
): Promise<RedisInstanceInsights> {
  const databaseIndex =
    input.databaseIndex ?? (Number.parseInt(input.database || '0', 10) || 0);
  const runtime = await createRedisRuntimeClient({
    ...input,
    database: `${databaseIndex}`,
  });

  try {
    if (databaseIndex > 0) {
      await runtime.client.select(databaseIndex);
    }

    const [
      serverInfoRaw,
      statsInfoRaw,
      memoryInfoRaw,
      clientsInfoRaw,
      persistenceInfoRaw,
      replicationInfoRaw,
      keyspaceInfoRaw,
      commandstatsInfoRaw,
      clientListRaw,
      latencyDoctorRaw,
      slowlogRaw,
      clusterInfoRaw,
      sentinelInfoRaw,
    ] = await Promise.all([
      runtime.client.info('server'),
      runtime.client.info('stats'),
      runtime.client.info('memory'),
      runtime.client.info('clients'),
      runtime.client.info('persistence'),
      runtime.client.info('replication'),
      runtime.client.info('keyspace'),
      runtime.client.info('commandstats'),
      safeCommand(runtime.client, ['CLIENT', 'LIST'], ''),
      safeCommand(runtime.client, ['LATENCY', 'DOCTOR'], ''),
      safeCommand(runtime.client, ['SLOWLOG', 'GET', '32'], [] as unknown[]),
      safeCommand(runtime.client, ['CLUSTER', 'INFO'], ''),
      safeCommand(runtime.client, ['INFO', 'sentinel'], ''),
    ]);

    const [dbSize, sampledKeys, configEntriesRaw] = await Promise.all([
      runtime.client.dbSize(),
      scanKeys(runtime.client),
      Promise.all(
        CONFIG_KEYS.map(name =>
          safeCommand(
            runtime.client,
            ['CONFIG', 'GET', name],
            [] as unknown[]
          ).then(result => parseConfigEntry(name, result))
        )
      ),
    ]);

    const sampledKeyMetrics = await Promise.all(
      sampledKeys.map(async key => {
        const [type, ttl, memoryUsage] = await Promise.all([
          runtime.client.type(key),
          runtime.client.ttl(key),
          safeCommand(runtime.client, ['MEMORY', 'USAGE', key], 0 as number),
        ]);

        return {
          key,
          type,
          ttl,
          memoryBytes: Number(memoryUsage) || 0,
        };
      })
    );

    const serverInfo = parseInfoBlock(serverInfoRaw);
    const statsInfo = parseInfoBlock(statsInfoRaw);
    const memoryInfo = parseInfoBlock(memoryInfoRaw);
    const clientsInfo = parseInfoBlock(clientsInfoRaw);
    const persistenceInfo = parseInfoBlock(persistenceInfoRaw);
    const replicationInfo = parseInfoBlock(replicationInfoRaw);
    const keyspaceInfo = parseInfoBlock(keyspaceInfoRaw);
    const commandstatsInfo = parseInfoBlock(commandstatsInfoRaw);
    const clusterInfo = parseInfoBlock(clusterInfoRaw);
    const sentinelInfo = parseInfoBlock(sentinelInfoRaw);
    const keyspaceDatabases = parseKeyspace(keyspaceInfo);
    const clientRows = parseClientList(clientListRaw);
    const slowlogEntries = parseSlowlog(slowlogRaw as unknown[]);
    const commandStats = parseCommandStats(commandstatsInfo);
    const replicationReplicas = parseReplicationReplicas(replicationInfo);

    const totalKeys = keyspaceDatabases.reduce(
      (count, database) => count + database.keyCount,
      0
    );
    const hits = toInteger(statsInfo.keyspace_hits);
    const misses = toInteger(statsInfo.keyspace_misses);
    const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

    const prefixMemoryMap = sampledKeyMetrics.reduce<
      Record<string, RedisPrefixMetric>
    >((acc, item) => {
      const prefix = getPrefixFromKey(item.key);
      const current = acc[prefix] || {
        prefix,
        keyCount: 0,
        memoryBytes: 0,
      };

      current.keyCount += 1;
      current.memoryBytes += item.memoryBytes;
      acc[prefix] = current;
      return acc;
    }, {});

    const topPrefixesByMemory = Object.values(prefixMemoryMap)
      .sort((left, right) => right.memoryBytes - left.memoryBytes)
      .slice(0, 8);

    const keyTypeDistribution = sampledKeyMetrics.reduce<
      Record<string, RedisKeyTypeDistribution>
    >((acc, item) => {
      const current = acc[item.type] || { type: item.type, count: 0 };
      current.count += 1;
      acc[item.type] = current;
      return acc;
    }, {});

    const addressCount = clientRows.reduce<Record<string, number>>(
      (acc, client) => {
        acc[client.addr] = (acc[client.addr] || 0) + 1;
        return acc;
      },
      {}
    );

    const suspiciousClients = clientRows.flatMap(client => {
      const reasons: string[] = [];

      if (client.idleSeconds > 3600) {
        reasons.push('idle for more than 1 hour');
      }

      if (client.flags.includes('b')) {
        reasons.push('client is blocked');
      }

      if ((addressCount[client.addr] || 0) >= 5) {
        reasons.push('many connections from same address');
      }

      return reasons.map(reason => ({
        clientId: client.id,
        reason: `${client.addr}: ${reason}`,
      }));
    });

    const usedMemory = toInteger(memoryInfo.used_memory);
    const maxmemory = toInteger(memoryInfo.maxmemory);
    const memoryWarnings: string[] = [];

    if (maxmemory > 0 && usedMemory / maxmemory >= 0.85) {
      memoryWarnings.push('Memory usage is above 85% of maxmemory.');
    }

    if (toNumber(memoryInfo.mem_fragmentation_ratio) >= 1.5) {
      memoryWarnings.push('Memory fragmentation is elevated.');
    }

    if (toInteger(statsInfo.evicted_keys) > 0) {
      memoryWarnings.push('Evictions have been recorded for this instance.');
    }

    const persistenceWarnings: string[] = [];
    const rdbEnabled = persistenceInfo.rdb_last_save_time !== undefined;
    const aofEnabled = persistenceInfo.aof_enabled === '1';

    if (!rdbEnabled && !aofEnabled) {
      persistenceWarnings.push(
        'Persistence is disabled for this Redis instance.'
      );
    }

    return {
      capturedAt: new Date().toISOString(),
      databaseIndex,
      overview: {
        redisVersion: serverInfo.redis_version || 'unknown',
        mode:
          serverInfo.redis_mode ||
          (clusterInfo.cluster_enabled === '1' ? 'cluster' : 'standalone'),
        uptimeSeconds: toInteger(serverInfo.uptime_in_seconds),
        connectedClients: toInteger(clientsInfo.connected_clients),
        usedMemory,
        usedMemoryHuman:
          memoryInfo.used_memory_human || formatBytes(usedMemory),
        totalKeys: totalKeys || dbSize,
        hitRate,
        opsPerSec: toNumber(statsInfo.instantaneous_ops_per_sec),
        evictedKeys: toInteger(statsInfo.evicted_keys),
        expiredKeys: toInteger(statsInfo.expired_keys),
        rejectedConnections: toInteger(statsInfo.rejected_connections),
      },
      memory: {
        usedMemory,
        usedMemoryHuman:
          memoryInfo.used_memory_human || formatBytes(usedMemory),
        usedMemoryPeak: toInteger(memoryInfo.used_memory_peak),
        usedMemoryPeakHuman:
          memoryInfo.used_memory_peak_human ||
          formatBytes(toInteger(memoryInfo.used_memory_peak)),
        memoryFragmentationRatio: toNumber(memoryInfo.mem_fragmentation_ratio),
        maxmemory,
        maxmemoryHuman:
          memoryInfo.maxmemory_human ||
          (maxmemory > 0 ? formatBytes(maxmemory) : 'unlimited'),
        maxmemoryPolicy: memoryInfo.maxmemory_policy || 'noeviction',
        topPrefixesByMemory,
        bigKeys: [...sampledKeyMetrics]
          .sort((left, right) => right.memoryBytes - left.memoryBytes)
          .slice(0, 10) as RedisBigKeyMetric[],
        warnings: memoryWarnings,
      },
      performance: {
        instantaneousOpsPerSec: toNumber(statsInfo.instantaneous_ops_per_sec),
        totalCommandsProcessed: toInteger(statsInfo.total_commands_processed),
        latencyDoctor: latencyDoctorRaw ? String(latencyDoctorRaw) : null,
        slowlog: slowlogEntries,
        commandStats,
        blockedClients: toInteger(clientsInfo.blocked_clients),
        longRunningLuaScripts: clientRows.filter(client =>
          ['eval', 'evalsha', 'fcall'].includes(client.cmd.toLowerCase())
        ),
      },
      keyspace: {
        databases: keyspaceDatabases,
        expiredKeyCount: toInteger(statsInfo.expired_keys),
        avgTtl:
          keyspaceDatabases.find(
            database => database.database === `db${databaseIndex}`
          )?.avgTtl || 0,
        keyTypeDistribution: Object.values(keyTypeDistribution).sort(
          (left, right) => right.count - left.count
        ),
        topPrefixes: topPrefixesByMemory.map(item => ({
          prefix: item.prefix,
          keyCount: item.keyCount,
        })),
        keysWithoutTtl: sampledKeyMetrics.filter(item => item.ttl < 0).length,
        hotKeysNote:
          'Hot key tracking requires Redis keyspace notifications or external sampling and is not available in this release.',
        sampledKeys: sampledKeyMetrics.length,
      },
      clients: {
        connectedClients: toInteger(clientsInfo.connected_clients),
        clients: clientRows,
        suspiciousClients,
      },
      persistence: {
        rdbEnabled,
        lastSaveStatus: persistenceInfo.rdb_last_bgsave_status || null,
        lastSaveTime: parseTimestamp(persistenceInfo.rdb_last_save_time),
        aofEnabled,
        aofRewriteInProgress: persistenceInfo.aof_rewrite_in_progress === '1',
        aofLastRewriteStatus: persistenceInfo.aof_last_bgrewrite_status || null,
        lastBgsaveError:
          persistenceInfo.rdb_last_bgsave_status === 'err'
            ? 'Background save failed.'
            : null,
        changesSinceLastSave: toInteger(
          persistenceInfo.rdb_changes_since_last_save
        ),
        warnings: persistenceWarnings,
      },
      replication: {
        role: replicationInfo.role || 'unknown',
        connectedReplicas: toInteger(replicationInfo.connected_slaves),
        replicas: replicationReplicas,
        replicationLag:
          replicationReplicas.length > 0
            ? Math.max(...replicationReplicas.map(replica => replica.lag || 0))
            : null,
        masterLinkStatus: replicationInfo.master_link_status || null,
        sentinelMasters: sentinelInfo.masters
          ? toInteger(sentinelInfo.masters)
          : null,
        clusterEnabled:
          clusterInfo.cluster_enabled === '1' ||
          serverInfo.redis_mode === 'cluster',
        clusterState: clusterInfo.cluster_state || null,
        clusterSlotsAssigned: clusterInfo.cluster_slots_assigned
          ? toInteger(clusterInfo.cluster_slots_assigned)
          : null,
        clusterKnownNodes: clusterInfo.cluster_known_nodes
          ? toInteger(clusterInfo.cluster_known_nodes)
          : null,
      },
      config: configEntriesRaw.filter(entry => entry.value !== ''),
    };
  } finally {
    await runtime.close();
  }
}

export async function killRedisClient(
  input: RedisRuntimeInput & { databaseIndex?: number },
  clientId: string
): Promise<InstanceActionResponse> {
  const databaseIndex =
    input.databaseIndex ?? (Number.parseInt(input.database || '0', 10) || 0);
  const runtime = await createRedisRuntimeClient({
    ...input,
    database: `${databaseIndex}`,
  });

  try {
    if (databaseIndex > 0) {
      await runtime.client.select(databaseIndex);
    }

    await runtime.client.sendCommand(['CLIENT', 'KILL', 'ID', clientId]);

    return {
      success: true,
      message: `Killed Redis client ${clientId}.`,
    };
  } finally {
    await runtime.close();
  }
}
