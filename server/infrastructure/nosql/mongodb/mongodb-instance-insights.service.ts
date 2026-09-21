import type { Db } from 'mongodb';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import type { MongoOverviewInsight } from '~/core/types/instance-insights.types';
import {
  parseCache,
  parseConnections,
  parseMemory,
  resolveTopology,
  toNumber,
} from './mongodb-instance-insights.parsers';
import { withMongoClient } from './mongodb.client';

type MongoDocument = Record<string, unknown>;

interface SafeResult<T> {
  value: T | null;
  warning: string | null;
}

const ADMIN_DATABASE = 'admin';

const describeError = (label: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return `${label} is unavailable: ${message}`;
};

// Monitoring commands need the clusterMonitor role and are restricted on some
// hosted tiers, so each one fails soft into a warning instead of the request.
const safeRun = async <T>(
  label: string,
  run: () => Promise<T>
): Promise<SafeResult<T>> => {
  try {
    return { value: await run(), warning: null };
  } catch (error) {
    return { value: null, warning: describeError(label, error) };
  }
};

const collectWarnings = (...results: SafeResult<unknown>[]) =>
  results.flatMap(result => (result.warning ? [result.warning] : []));

const runAdminCommand = (admin: Db, command: MongoDocument) =>
  admin.command(command) as Promise<MongoDocument>;

export async function getMongoOverviewInsight(
  params: DatabaseMetadataRequestParams
): Promise<MongoOverviewInsight> {
  return withMongoClient(params, async client => {
    const admin = client.db(ADMIN_DATABASE);
    const [status, hello, buildInfo] = await Promise.all([
      safeRun('serverStatus', () =>
        runAdminCommand(admin, { serverStatus: 1 })
      ),
      safeRun('hello', () => runAdminCommand(admin, { hello: 1 })),
      safeRun('buildInfo', () => runAdminCommand(admin, { buildInfo: 1 })),
    ]);

    const statusDoc = status.value ?? {};
    const storageEngine = statusDoc.storageEngine as MongoDocument | undefined;

    return {
      version: String(buildInfo.value?.version ?? statusDoc.version ?? ''),
      host: String(statusDoc.host ?? ''),
      uptimeSeconds: toNumber(statusDoc.uptime),
      storageEngine:
        typeof storageEngine?.name === 'string' ? storageEngine.name : null,
      topology: resolveTopology(hello.value),
      replicaSetName:
        typeof hello.value?.setName === 'string' ? hello.value.setName : null,
      connections: parseConnections(statusDoc),
      memory: parseMemory(statusDoc),
      cache: parseCache(statusDoc),
      warnings: collectWarnings(status, hello, buildInfo),
    };
  });
}
