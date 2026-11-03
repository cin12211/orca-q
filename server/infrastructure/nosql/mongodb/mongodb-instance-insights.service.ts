import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import type {
  MongoOpcounters,
  MongoOverviewInsight,
  MongoReplicaMemberInsight,
  MongoReplicationInsight,
  MongoTopology,
} from '~/core/types/instance-insights.types';
import { withMongoClient } from './mongodb.client';

type MongoCommandResult = Record<string, any>;

interface MongoAdminCommandSource {
  command(command: Record<string, unknown>): Promise<MongoCommandResult>;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  return null;
};

/** Turns permission errors into a hint the user can act on. */
export function describeMongoCommandError(
  error: unknown,
  command: string
): string {
  const err = error as { codeName?: string; code?: number; message?: string };
  if (err?.codeName === 'Unauthorized' || err?.code === 13) {
    return `Not authorized to run ${command}. Grant the clusterMonitor role to see this data.`;
  }
  return err?.message || `${command} failed.`;
}

function mapOpcounters(source: MongoCommandResult | undefined) {
  if (!source) return null;
  return {
    insert: toNumber(source.insert) ?? 0,
    query: toNumber(source.query) ?? 0,
    update: toNumber(source.update) ?? 0,
    delete: toNumber(source.delete) ?? 0,
    getmore: toNumber(source.getmore) ?? 0,
    command: toNumber(source.command) ?? 0,
  } satisfies MongoOpcounters;
}

export async function collectMongoOverview(
  admin: MongoAdminCommandSource
): Promise<MongoOverviewInsight> {
  const [buildInfo, serverStatus] = await Promise.allSettled([
    admin.command({ buildInfo: 1 }),
    // Keep `metrics`: excluding it also drops `mem` from the response.
    admin.command({ serverStatus: 1, repl: 0, locks: 0, wiredTiger: 0 }),
  ]);

  const build = buildInfo.status === 'fulfilled' ? buildInfo.value : undefined;
  const status =
    serverStatus.status === 'fulfilled' ? serverStatus.value : undefined;

  return {
    version: status?.version ?? build?.version ?? null,
    host: status?.host ?? null,
    process: status?.process ?? null,
    storageEngine: status?.storageEngine?.name ?? null,
    uptimeSeconds: toNumber(status?.uptime),
    connections: status?.connections
      ? {
          current: toNumber(status.connections.current) ?? 0,
          available: toNumber(status.connections.available) ?? 0,
          totalCreated: toNumber(status.connections.totalCreated) ?? 0,
        }
      : null,
    opcounters: mapOpcounters(status?.opcounters),
    memory: status?.mem
      ? {
          residentMb: toNumber(status.mem.resident),
          virtualMb: toNumber(status.mem.virtual),
        }
      : null,
    network: status?.network
      ? {
          bytesIn: toNumber(status.network.bytesIn) ?? 0,
          bytesOut: toNumber(status.network.bytesOut) ?? 0,
          numRequests: toNumber(status.network.numRequests) ?? 0,
        }
      : null,
    capturedAt: new Date().toISOString(),
    serverStatusError:
      serverStatus.status === 'rejected'
        ? describeMongoCommandError(serverStatus.reason, 'serverStatus')
        : null,
  };
}

function resolveTopology(hello: MongoCommandResult): MongoTopology {
  if (hello.msg === 'isdbgrid') return 'sharded';
  if (hello.setName) return 'replicaSet';
  return 'standalone';
}

function resolveRole(hello: MongoCommandResult, topology: MongoTopology) {
  if (topology === 'sharded') return 'mongos';
  if (topology === 'standalone') return 'standalone';
  if (hello.isWritablePrimary || hello.ismaster) return 'primary';
  if (hello.secondary) return 'secondary';
  if (hello.arbiterOnly) return 'arbiter';
  return 'other';
}

export function mapReplicaMembers(
  replSetStatus: MongoCommandResult
): MongoReplicaMemberInsight[] {
  const members: MongoCommandResult[] = Array.isArray(replSetStatus.members)
    ? replSetStatus.members
    : [];
  const primaryOptime = members.find(member => member.stateStr === 'PRIMARY')
    ?.optimeDate as Date | undefined;

  return members.map(member => {
    const optimeDate =
      member.optimeDate instanceof Date ? member.optimeDate : undefined;
    const lagSeconds =
      primaryOptime instanceof Date && optimeDate
        ? Math.max(
            0,
            Math.round((primaryOptime.getTime() - optimeDate.getTime()) / 1000)
          )
        : null;

    return {
      name: String(member.name ?? ''),
      stateStr: String(member.stateStr ?? 'UNKNOWN'),
      health: toNumber(member.health),
      uptimeSeconds: toNumber(member.uptime),
      optimeDate: toIsoString(optimeDate),
      lagSeconds: member.stateStr === 'ARBITER' ? null : lagSeconds,
      pingMs: toNumber(member.pingMs),
      self: Boolean(member.self),
    };
  });
}

export async function collectMongoReplication(
  admin: MongoAdminCommandSource
): Promise<MongoReplicationInsight> {
  const hello = await admin.command({ hello: 1 });
  const topology = resolveTopology(hello);

  const insight: MongoReplicationInsight = {
    topology,
    role: resolveRole(hello, topology),
    setName: hello.setName ?? null,
    primary: hello.primary ?? null,
    me: hello.me ?? null,
    hosts: Array.isArray(hello.hosts) ? hello.hosts.map(String) : [],
    members: [],
    membersError: null,
  };

  if (topology !== 'replicaSet') {
    return insight;
  }

  try {
    insight.members = mapReplicaMembers(
      await admin.command({ replSetGetStatus: 1 })
    );
  } catch (error) {
    insight.membersError = describeMongoCommandError(error, 'replSetGetStatus');
  }

  return insight;
}

export function getMongoOverviewInsight(params: DatabaseMetadataRequestParams) {
  return withMongoClient(params, client =>
    collectMongoOverview(client.db('admin'))
  );
}

export function getMongoReplicationInsight(
  params: DatabaseMetadataRequestParams
) {
  return withMongoClient(params, client =>
    collectMongoReplication(client.db('admin'))
  );
}
