import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export interface SafeQueryOutcome<T> {
  rows: T[];
  error: string | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const candidate = error as Record<string, unknown> | null;
  return String(
    candidate?.message || candidate?.statusMessage || 'Unknown database error'
  );
}

/**
 * Runs a read-only insights query and reports failures (usually missing
 * privileges) as a message instead of throwing, so one unavailable section
 * does not blank the whole Instance Insights view.
 */
export async function trySafeQuery<T>(
  adapter: IDatabaseAdapter,
  sql: string,
  bindings: unknown[] = []
): Promise<SafeQueryOutcome<T>> {
  try {
    return {
      rows: await adapter.rawQuery<T>(sql, bindings as any[]),
      error: null,
    };
  } catch (error) {
    return { rows: [], error: getErrorMessage(error) };
  }
}
