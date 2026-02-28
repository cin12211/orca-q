import { createError } from 'h3';

type DatabaseLikeError = {
  message?: string;
  cause?: unknown;
  driverError?: unknown;
  code?: string;
};

export function toDatabaseHttpError(error: unknown, statusCode = 500) {
  const err = (error ?? {}) as DatabaseLikeError;
  const message =
    err.message ||
    (error instanceof Error ? error.message : 'Unknown database error');

  return createError({
    statusCode,
    statusMessage: message,
    message,
    cause: err.cause,
    data: {
      code: err.code,
      driverError: err.driverError,
    },
  });
}
