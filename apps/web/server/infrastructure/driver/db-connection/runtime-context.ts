import {
  resolveConnectionFamily,
  resolveConnectionProviderKind,
} from '~/core/constants/connection-capabilities';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';

export function resolveRuntimeContext(input: {
  type: DatabaseClientType;
  method: EConnectionMethod;
  providerKind?: EConnectionProviderKind;
  family?: EConnectionFamily;
  managedSqlite?: IManagedSqliteConfig;
}) {
  const providerKind = resolveConnectionProviderKind({
    type: input.type,
    method: input.method,
    providerKind: input.providerKind,
    managedSqlite: input.managedSqlite,
  });

  const family =
    input.family ??
    resolveConnectionFamily({
      type: input.type,
      method: input.method,
      providerKind,
      managedSqlite: input.managedSqlite,
    });

  return {
    providerKind,
    family,
  };
}
