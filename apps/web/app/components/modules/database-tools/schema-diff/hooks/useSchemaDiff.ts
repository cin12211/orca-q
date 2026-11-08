import { getConnectionParams } from '#shared/helpers/connection-helper';
import {
  EConnectionMethod,
  type Connection,
} from '#shared/types/entities/connection.entity';
import type {
  SchemaDiffResponse,
  ConnectionParams,
} from '#shared/types/schema-diff.types';
import { schemaDiffService } from '../services/schemaDiff.service';

export function useSchemaDiff() {
  const result = ref<SchemaDiffResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const safeMode = ref(true);

  const buildParams = (conn: Connection): ConnectionParams => ({
    ...getConnectionParams(conn),
    // Only string connections use it: form connections keep a generated,
    // unescaped string, and file connections resolve from filePath.
    connectionString:
      conn.method === EConnectionMethod.STRING ? conn.connectionString : '',
  });

  const runDiff = async (source: Connection, target: Connection) => {
    isLoading.value = true;
    error.value = null;
    result.value = null;

    try {
      result.value = await schemaDiffService.diff({
        source: buildParams(source),
        target: buildParams(target),
        safeMode: safeMode.value,
      });
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Schema diff failed. Check connection details.';
    } finally {
      isLoading.value = false;
    }
  };

  const reset = () => {
    result.value = null;
    error.value = null;
  };

  const currentSql = computed(() => {
    if (!result.value) return '';
    return safeMode.value ? result.value.sql.safe : result.value.sql.full;
  });

  const hasDifferences = computed(() => {
    if (!result.value) return false;
    const { added, removed, modified } = result.value.summary;
    return added + removed + modified > 0;
  });

  return {
    result,
    isLoading,
    error,
    safeMode,
    currentSql,
    hasDifferences,
    runDiff,
    reset,
  };
}
