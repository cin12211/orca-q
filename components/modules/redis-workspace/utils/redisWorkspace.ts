import type { Connection } from '~/core/stores';

export const parseRedisDatabaseIndex = (value?: string | null) => {
  const parsed = Number.parseInt(value || '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const DESTRUCTIVE_COMMANDS = new Set([
  'DEL',
  'UNLINK',
  'FLUSHALL',
  'FLUSHDB',
  'RENAME',
  'RENAMENX',
  'MIGRATE',
  'COPY',
  'MOVE',
  'RESTORE',
  'SET',
  'SETEX',
  'PSETEX',
  'MSET',
  'INCR',
  'DECR',
  'HSET',
  'HMSET',
  'LPUSH',
  'RPUSH',
  'SADD',
  'ZADD',
  'XADD',
]);

export const getErrorMessage = (error: unknown) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const normalized = error as {
      message?: string;
      data?: { message?: string };
      response?: { _data?: { message?: string } };
    };

    return (
      normalized.data?.message ||
      normalized.response?._data?.message ||
      normalized.message ||
      'Request failed.'
    );
  }

  return 'Request failed.';
};

export const getRedisUnavailableReason = (
  error: unknown,
  feature: 'edit' | 'analysis' | 'command'
) => {
  const message = getErrorMessage(error);

  if (/READONLY/i.test(message)) {
    if (feature === 'edit') {
      return 'This Redis endpoint is read-only. Value updates are unavailable.';
    }

    return 'This Redis endpoint is read-only for mutating commands.';
  }

  if (/NOPERM|NOAUTH|WRONGPASS|ACL/i.test(message)) {
    if (feature === 'analysis') {
      return 'The connected Redis account does not have permission to read analysis metrics.';
    }

    if (feature === 'edit') {
      return 'The connected Redis account does not have permission to edit values.';
    }

    return 'The connected Redis account does not have permission to run this Redis command.';
  }

  return '';
};

export const buildConnectionBody = (connection: Connection) => ({
  method: connection.method,
  stringConnection: connection.connectionString,
  host: connection.host,
  port: connection.port,
  username: connection.username,
  password: connection.password,
  database: connection.database,
  ssl: connection.ssl,
  ssh: connection.ssh,
});
