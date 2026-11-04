import { createError } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~~/app/core/helpers';
import type { DatabaseDriverError } from '~~/app/core/types';

export function createDatabaseHttpError(
  dbType: DatabaseClientType | DatabaseClientType.POSTGRES,
  error: unknown,
  statusCode = 500
) {
  const err = (error ?? {}) as Record<string, any>;
  const message =
    err.message ||
    (error instanceof Error ? error.message : 'Unknown database error');

  const normalizeError = new ErrorNormalizer({ dbType, ...err })
    .nomaltliztionErrror;

  return createError({
    statusCode,
    statusMessage: message,
    message,
    cause: err.cause,
    data: {
      dbType,
      normalizeError: {
        dbType,
        ...normalizeError,
      },
      ...err,
    } as DatabaseDriverError,
  });
}
