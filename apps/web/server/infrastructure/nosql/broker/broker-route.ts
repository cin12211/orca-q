import { createError, readBody, type H3Event } from 'h3';
import { z } from 'zod';
import { normalizeConnectionError } from '~/server/infrastructure/driver/connection-error';
import {
  BrokerConnectionError,
  isBrokerTlsEnabled,
  parseBrokerBody,
  type BrokerConnectionInput,
} from './broker-connection';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_GATEWAY = 502;

function toHttpError(error: unknown, connection?: BrokerConnectionInput) {
  if (error instanceof z.ZodError) {
    return createError({
      statusCode: HTTP_BAD_REQUEST,
      message: 'Invalid request body.',
      data: { message: 'Invalid request body.', detail: error.message },
    });
  }

  if (error instanceof Error && error.name === 'RabbitNotFoundError') {
    return createError({
      statusCode: HTTP_NOT_FOUND,
      message: 'This resource no longer exists on the broker.',
      data: { message: 'This resource no longer exists on the broker.' },
    });
  }

  const normalized =
    error instanceof BrokerConnectionError
      ? {
          message: error.message,
          hint: error.hint,
          code: error.code,
          detail: error.detail,
        }
      : normalizeConnectionError(error, {
          sslEnabled: isBrokerTlsEnabled(connection?.ssl),
          sshEnabled: Boolean(connection?.ssh?.enabled),
        });

  return createError({
    statusCode: HTTP_BAD_GATEWAY,
    message: normalized.message,
    data: normalized,
  });
}

/**
 * Shared handler for RabbitMQ / Kafka routes: validates `{ connection, ... }`
 * with the given zod shape and turns broker errors into readable HTTP errors.
 */
export function defineBrokerHandler<T extends z.ZodRawShape, R>(
  shape: T,
  run: (
    body: z.infer<z.ZodObject<T>> & { connection: BrokerConnectionInput }
  ) => Promise<R>
) {
  return defineEventHandler(async (event: H3Event) => {
    let connection: BrokerConnectionInput | undefined;

    try {
      const body = parseBrokerBody(await readBody(event), shape);
      connection = body.connection;
      return await run(body);
    } catch (error) {
      throw toHttpError(error, connection);
    }
  });
}
