import type {
  RedisDatabaseOption,
  RedisKeyDetail,
  RedisKeyListItem,
  RedisKeyTableColumn,
  RedisKeyTableRow,
  RedisTableKind,
  RedisValueUpdatePayload,
} from '~/core/types/redis-workspace.types';
import {
  createRedisRuntimeClient,
  type RedisRuntimeInput,
} from './redis.client';

export interface RedisBrowserInput extends RedisRuntimeInput {
  databaseIndex?: number;
}

type RedisClient = Awaited<
  ReturnType<typeof createRedisRuntimeClient>
>['client'];

const resolveDatabaseIndex = (input: RedisBrowserInput) => {
  const parsed =
    input.databaseIndex ?? Number.parseInt(input.database ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatBytes = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  const digits = nextValue >= 10 || unitIndex === 0 ? 0 : 1;
  return `${nextValue.toFixed(digits)} ${units[unitIndex]}`;
};

const formatTtl = (ttl: number) => {
  if (ttl < 0) {
    return 'Persisted';
  }

  if (ttl < 60) {
    return `${ttl}s`;
  }

  if (ttl < 3600) {
    return `${Math.floor(ttl / 60)}m`;
  }

  if (ttl < 86400) {
    return `${Math.floor(ttl / 3600)}h`;
  }

  return `${Math.floor(ttl / 86400)}d`;
};

const safeCommand = async <T>(run: () => Promise<T>, fallback: T) => {
  try {
    return await run();
  } catch {
    return fallback;
  }
};

const parseInfoBlock = (raw: string) => {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes(':'))
    .reduce<Record<string, string>>((acc, line) => {
      const [key, ...rest] = line.split(':');
      acc[key] = rest.join(':');
      return acc;
    }, {});
};

const withSelectedDatabase = async <T>(
  input: RedisBrowserInput,
  run: (client: RedisClient) => Promise<T>
) => {
  const databaseIndex = resolveDatabaseIndex(input);
  const runtime = await createRedisRuntimeClient({
    ...input,
    database: `${databaseIndex}`,
  });

  try {
    if (databaseIndex > 0) {
      await runtime.client.select(databaseIndex);
    }

    return await run(runtime.client);
  } finally {
    await runtime.close();
  }
};

const readRedisValue = async (
  client: RedisClient,
  key: string,
  type: string
) => {
  switch (type) {
    case 'string':
      return await client.get(key);
    case 'hash':
      return await client.hGetAll(key);
    case 'list':
      return await client.lRange(key, 0, 199);
    case 'set':
      return await client.sMembers(key);
    case 'zset':
      return await client.zRangeWithScores(key, 0, 199);
    case 'stream':
      return await client.sendCommand([
        'XRANGE',
        key,
        '-',
        '+',
        'COUNT',
        '100',
      ]);
    default:
      return await client.get(key);
  }
};

const getRedisLength = async (
  client: RedisClient,
  key: string,
  type: string,
  value: unknown
) => {
  switch (type) {
    case 'string':
      return await safeCommand<number | null>(() => client.strLen(key), null);
    case 'hash':
      return await safeCommand<number | null>(
        () => client.hLen(key),
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.keys(value).length
          : null
      );
    case 'list':
      return await safeCommand<number | null>(
        () => client.lLen(key),
        Array.isArray(value) ? value.length : null
      );
    case 'set':
      return await safeCommand<number | null>(
        () => client.sCard(key),
        Array.isArray(value) ? value.length : null
      );
    case 'zset':
      return await safeCommand<number | null>(
        () => client.zCard(key),
        Array.isArray(value) ? value.length : null
      );
    default:
      return null;
  }
};

const getRedisEncoding = async (client: RedisClient, key: string) => {
  return await safeCommand(
    async () => String(await client.sendCommand(['OBJECT', 'ENCODING', key])),
    null
  );
};

const getRedisMemoryUsage = async (client: RedisClient, key: string) => {
  return await safeCommand<number | null>(async () => {
    const rawValue = await client.sendCommand(['MEMORY', 'USAGE', key]);
    return rawValue === null ? null : Number(rawValue);
  }, null);
};

const tryParseJsonString = (value: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith('{') && !trimmedValue.startsWith('[')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedValue);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const buildTablePreview = (
  type: string,
  value: unknown
): {
  tableKind: RedisTableKind;
  tableColumns: RedisKeyTableColumn[];
  tableRows: RedisKeyTableRow[];
} | null => {
  if (
    type === 'hash' &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return {
      tableKind: 'hash',
      tableColumns: [
        { key: 'field', label: 'Field', editable: true },
        { key: 'value', label: 'Value', editable: true },
      ],
      tableRows: Object.entries(value as Record<string, string>).map(
        ([field, fieldValue], index) => ({
          id: `hash-${index}`,
          field,
          value: fieldValue,
        })
      ),
    };
  }

  if (type === 'list' && Array.isArray(value)) {
    return {
      tableKind: 'list',
      tableColumns: [
        { key: 'index', label: '#', type: 'number' },
        { key: 'value', label: 'Value', editable: true },
      ],
      tableRows: value.map((item, index) => ({
        id: `list-${index}`,
        index,
        value: String(item ?? ''),
      })),
    };
  }

  if (type === 'set' && Array.isArray(value)) {
    return {
      tableKind: 'set',
      tableColumns: [{ key: 'value', label: 'Member', editable: true }],
      tableRows: value.map((item, index) => ({
        id: `set-${index}`,
        value: String(item ?? ''),
      })),
    };
  }

  if (type === 'zset' && Array.isArray(value)) {
    return {
      tableKind: 'zset',
      tableColumns: [
        { key: 'value', label: 'Member', editable: true },
        { key: 'score', label: 'Score', editable: true, type: 'number' },
      ],
      tableRows: value.map((item, index) => ({
        id: `zset-${index}`,
        value: String((item as { value?: string }).value ?? ''),
        score: Number((item as { score?: number }).score ?? 0),
      })),
    };
  }

  return null;
};

const buildRedisKeyDetail = async (
  client: RedisClient,
  key: string,
  databaseIndex: number
): Promise<RedisKeyDetail> => {
  const type = await client.type(key);
  const ttl = await client.ttl(key);
  const value = await readRedisValue(client, key, type);
  const memoryUsage = await getRedisMemoryUsage(client, key);
  const length = await getRedisLength(client, key, type, value);
  const encoding = await getRedisEncoding(client, key);
  const jsonValue =
    type === 'string' ? tryParseJsonString(value as string | null) : null;
  const tablePreview = buildTablePreview(type, value);

  if (type === 'string') {
    return {
      key,
      type,
      ttl,
      databaseIndex,
      value: jsonValue ?? value,
      previewKind: jsonValue ? 'json' : 'text',
      editingSupported: true,
      memoryUsage,
      memoryUsageHuman: formatBytes(memoryUsage),
      length,
      encoding,
      ttlLabel: formatTtl(ttl),
      stringFormat: jsonValue ? 'json' : 'plain',
    };
  }

  if (tablePreview) {
    return {
      key,
      type,
      ttl,
      databaseIndex,
      value,
      previewKind: 'table',
      tableKind: tablePreview.tableKind,
      tableColumns: tablePreview.tableColumns,
      tableRows: tablePreview.tableRows,
      editingSupported: true,
      memoryUsage,
      memoryUsageHuman: formatBytes(memoryUsage),
      length,
      encoding,
      ttlLabel: formatTtl(ttl),
    };
  }

  return {
    key,
    type,
    ttl,
    databaseIndex,
    value,
    previewKind: 'readonly',
    editingSupported: false,
    memoryUsage,
    memoryUsageHuman: formatBytes(memoryUsage),
    length,
    encoding,
    ttlLabel: formatTtl(ttl),
  };
};

const normalizeTableRows = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(row => row && typeof row === 'object')
    .map(row => {
      const normalizedRow = row as Record<string, unknown>;
      const { id: _id, ...rest } = normalizedRow;
      return rest;
    });
};

const applyRedisTtl = async (
  client: RedisClient,
  key: string,
  ttlSeconds?: number | null
) => {
  if (ttlSeconds === undefined) {
    return;
  }

  if (ttlSeconds === null || ttlSeconds < 0) {
    await client.persist(key);
    return;
  }

  await client.expire(key, Math.max(1, Math.floor(ttlSeconds)));
};

export async function listRedisKeys(
  input: RedisBrowserInput,
  options?: {
    cursor?: string;
    keyPattern?: string;
    count?: number;
  }
) {
  return withSelectedDatabase(input, async client => {
    const scanResult = await client.scan(options?.cursor || '0', {
      MATCH: options?.keyPattern || '*',
      COUNT: options?.count || 100,
    });

    const keys = await Promise.all(
      scanResult.keys.map(async key => {
        const [type, ttl, memoryUsage] = await Promise.all([
          client.type(key),
          client.ttl(key),
          getRedisMemoryUsage(client, key),
        ]);

        return {
          key,
          type,
          ttl,
          memoryUsage,
          memoryUsageHuman: formatBytes(memoryUsage),
        };
      })
    );

    return {
      cursor: `${scanResult.cursor}`,
      keys: keys as RedisKeyListItem[],
    };
  });
}

export async function listRedisDatabases(
  input: RedisBrowserInput,
  selectedDatabaseIndex = resolveDatabaseIndex(input)
): Promise<RedisDatabaseOption[]> {
  return withSelectedDatabase(input, async client => {
    const info = await client.info('keyspace');
    const keyspace = parseInfoBlock(info);
    const databases = new Map<number, RedisDatabaseOption>();

    Object.entries(keyspace).forEach(([databaseKey, rawValue]) => {
      if (!databaseKey.startsWith('db')) {
        return;
      }

      const index = Number.parseInt(databaseKey.slice(2), 10);

      if (!Number.isFinite(index)) {
        return;
      }

      const values = rawValue
        .split(',')
        .reduce<Record<string, string>>((acc, item) => {
          const [key, metricValue] = item.split('=');
          acc[key] = metricValue;
          return acc;
        }, {});

      databases.set(index, {
        index,
        label: `DB ${index}`,
        keyCount: Number.parseInt(values.keys || '0', 10),
        expires: Number.parseInt(values.expires || '0', 10),
        avgTtl: values.avg_ttl ? Number.parseInt(values.avg_ttl, 10) : null,
      });
    });

    if (!databases.has(selectedDatabaseIndex)) {
      databases.set(selectedDatabaseIndex, {
        index: selectedDatabaseIndex,
        label: `DB ${selectedDatabaseIndex}`,
        keyCount: 0,
        expires: 0,
        avgTtl: null,
      });
    }

    return [...databases.values()].sort(
      (left, right) => left.index - right.index
    );
  });
}

export async function getRedisKeyDetail(
  input: RedisBrowserInput,
  key: string
): Promise<RedisKeyDetail> {
  return withSelectedDatabase(input, async client => {
    return buildRedisKeyDetail(client, key, resolveDatabaseIndex(input));
  });
}

export async function updateRedisKeyValue(
  input: RedisBrowserInput,
  key: string,
  payload: RedisValueUpdatePayload
) {
  return withSelectedDatabase(input, async client => {
    const type = await client.type(key);
    const databaseIndex = resolveDatabaseIndex(input);
    const currentTtl = await client.ttl(key);
    const nextTtl =
      payload.ttlSeconds === undefined
        ? currentTtl >= 0
          ? currentTtl
          : undefined
        : payload.ttlSeconds;

    if (type === 'string') {
      const nextValue =
        payload.previewKind === 'json' || payload.stringFormat === 'json'
          ? JSON.stringify(payload.value ?? null, null, 2)
          : String(payload.value ?? '');

      await client.set(key, nextValue);
      await applyRedisTtl(client, key, nextTtl);
      return buildRedisKeyDetail(client, key, databaseIndex);
    }

    if (type === 'hash') {
      const hashValue = Object.fromEntries(
        normalizeTableRows(payload.value)
          .map(row => [String(row.field ?? ''), String(row.value ?? '')])
          .filter(([field]) => field)
      );

      await client.del(key);
      if (Object.keys(hashValue).length > 0) {
        await client.hSet(key, hashValue);
      }

      await applyRedisTtl(client, key, nextTtl);
      return buildRedisKeyDetail(client, key, databaseIndex);
    }

    if (type === 'list') {
      const values = normalizeTableRows(payload.value).map(row =>
        String(row.value ?? '')
      );

      await client.del(key);
      if (values.length > 0) {
        await client.rPush(key, values);
      }

      await applyRedisTtl(client, key, nextTtl);
      return buildRedisKeyDetail(client, key, databaseIndex);
    }

    if (type === 'set') {
      const values = normalizeTableRows(payload.value)
        .map(row => String(row.value ?? '').trim())
        .filter(Boolean);

      await client.del(key);
      if (values.length > 0) {
        await client.sAdd(key, values);
      }

      await applyRedisTtl(client, key, nextTtl);
      return buildRedisKeyDetail(client, key, databaseIndex);
    }

    if (type === 'zset') {
      const values = normalizeTableRows(payload.value)
        .map(row => ({
          value: String(row.value ?? '').trim(),
          score: Number(row.score ?? 0),
        }))
        .filter(row => row.value);

      await client.del(key);
      if (values.length > 0) {
        await client.zAdd(key, values);
      }

      await applyRedisTtl(client, key, nextTtl);
      return buildRedisKeyDetail(client, key, databaseIndex);
    }

    if (payload.ttlSeconds !== undefined) {
      await applyRedisTtl(client, key, nextTtl);
      return buildRedisKeyDetail(client, key, databaseIndex);
    }

    throw new Error(`Editing is not supported for Redis ${type} keys.`);
  });
}
