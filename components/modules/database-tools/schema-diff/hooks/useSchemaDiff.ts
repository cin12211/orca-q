import type { Connection } from '~/core/types/entities/connection.entity';
import { schemaDiffService } from '../services/schemaDiff.service';
import type {
  SchemaDiffResponse,
  ConnectionParams,
} from '../types/schema-diff.types';

export function useSchemaDiff() {
  const result = ref<SchemaDiffResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const safeMode = ref(true);

  const buildParams = (conn: Connection): ConnectionParams => ({
    type: conn.type,
    connectionString: conn.connectionString,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    password: conn.password,
    database: conn.database,
    ssl: conn.ssl,
    ssh: conn.ssh,
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
