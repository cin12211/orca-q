import { useRedisWorkspace } from '~/components/modules/driver/redis/quick-query/hooks/useRedisWorkspace';
import type { RawQueryExecutor } from '~/components/modules/raw-query/contracts';
import { useRawQueryFileContentContext } from '~/components/modules/raw-query/hooks';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createRedisCommandExecutor } from '../services';

/**
 * Binds the raw query Redis entry to the workspace session that owns the
 * selected database index, and builds the executor from that reactive index.
 *
 * The connection comes from the shared file-content context so switching
 * connection in the editor header reaches the workspace too.
 */
export function useRedisRawQuery() {
  const { connection } = useRawQueryFileContentContext();

  // Mirrors the previous entry: a non-Redis selection must not open a session.
  const redisConnection = computed(() =>
    connection.value?.type === DatabaseClientType.REDIS
      ? connection.value
      : undefined
  );

  const workspace = useRedisWorkspace({
    connection: redisConnection,
    mode: 'meta',
  });

  const setDatabaseIndex = (databaseIndex: number) => {
    workspace.selectedDatabaseIndex.value = databaseIndex;
  };

  const executor: RawQueryExecutor = createRedisCommandExecutor(
    workspace.selectedDatabaseIndex
  );

  return {
    databases: workspace.databases,
    selectedDatabaseIndex: workspace.selectedDatabaseIndex,
    setDatabaseIndex,
    executor,
  };
}
