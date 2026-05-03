import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionFamily,
  EConnectionProviderKind,
} from '~/core/types/entities/connection.entity';

export function isNoSqlClientType(type: DatabaseClientType) {
  return type === DatabaseClientType.REDIS;
}

export function buildUnsupportedConnectionMessage(input: {
  family: EConnectionFamily;
  providerKind: EConnectionProviderKind;
}) {
  if (input.family === EConnectionFamily.REDIS) {
    return 'Redis connections are supported, but they cannot be created through the SQL adapter stack.';
  }

  return 'Only SQL-family connections are wired through the current runtime adapter stack.';
}

export function assertSupportedConnectionRuntime(input: {
  family: EConnectionFamily;
  providerKind: EConnectionProviderKind;
}) {
  const isSupported = input.family === EConnectionFamily.SQL;

  if (!isSupported) {
    throw new Error(buildUnsupportedConnectionMessage(input));
  }
}
