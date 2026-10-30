import http from 'node:http';
import https from 'node:https';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import {
  BrokerConnectionError,
  isBrokerTlsEnabled,
  type BrokerConnectionInput,
} from '../broker/broker-connection';

export const DEFAULT_RABBITMQ_MANAGEMENT_PORT = 15672;
const REQUEST_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | undefined;

export interface RabbitManagementClient {
  get: <T>(path: string, query?: Record<string, QueryValue>) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
  put: <T>(path: string, body: unknown) => Promise<T>;
  delete: <T>(path: string, headers?: Record<string, string>) => Promise<T>;
  close: () => Promise<void>;
}

export class RabbitNotFoundError extends Error {
  constructor(path: string) {
    super(`RabbitMQ resource not found: ${path}`);
    this.name = 'RabbitNotFoundError';
  }
}

/** Build `/api/a/b` with each segment URL-encoded (vhost `/` becomes `%2F`). */
export function rabbitApiPath(...segments: string[]) {
  return `/api/${segments.map(segment => encodeURIComponent(segment)).join('/')}`;
}

function buildQueryString(query?: Record<string, QueryValue>) {
  if (!query) return '';

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  const text = params.toString();
  return text ? `?${text}` : '';
}

function toHttpError(status: number, path: string, body: string) {
  if (status === 401) {
    return new BrokerConnectionError(
      'Authentication failed — wrong username or password.',
      'Check the RabbitMQ user and password. The user also needs the "management" (or "monitoring") tag to use the Management API.',
      'RABBITMQ_401',
      body
    );
  }

  if (status === 403) {
    return new BrokerConnectionError(
      'This RabbitMQ user is not allowed to read this resource.',
      'Grant the user permissions on the virtual host, or the "monitoring" tag for node data.',
      'RABBITMQ_403',
      body
    );
  }

  if (status === 404) {
    return new RabbitNotFoundError(path);
  }

  return new BrokerConnectionError(
    `RabbitMQ Management API returned HTTP ${status}.`,
    undefined,
    `RABBITMQ_${status}`,
    body
  );
}

export async function createRabbitManagementClient(
  input: BrokerConnectionInput
): Promise<RabbitManagementClient> {
  if (!input.host) {
    throw new BrokerConnectionError('RabbitMQ host is required.');
  }

  let host = input.host;
  let port = Number.parseInt(
    input.port || `${DEFAULT_RABBITMQ_MANAGEMENT_PORT}`,
    10
  );
  let closeTunnel: (() => Promise<void>) | undefined;

  if (input.ssh?.enabled) {
    const tunnel = await createSshTunnel(input.ssh, host, port);
    host = tunnel.localHost;
    port = tunnel.localPort;
    closeTunnel = tunnel.close;
  }

  const useTls = isBrokerTlsEnabled(input.ssl);
  const transport = useTls ? https : http;
  const authorization = `Basic ${Buffer.from(
    `${input.username ?? ''}:${input.password ?? ''}`
  ).toString('base64')}`;

  const request = <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ) =>
    new Promise<T>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = transport.request(
        {
          host,
          port,
          path,
          method,
          // A fresh socket per request: the Management API closes idle
          // keep-alive sockets, which surfaced as random ECONNRESET errors.
          agent: false,
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            ...extraHeaders,
            authorization,
            // Some endpoints (user-limits) answer 406 to a strict JSON accept.
            accept: 'application/json, */*',
            ...(payload
              ? {
                  'content-type': 'application/json',
                  'content-length': Buffer.byteLength(payload),
                }
              : {}),
          },
          ...(useTls
            ? {
                ca: input.ssl?.ca || undefined,
                cert: input.ssl?.cert || undefined,
                key: input.ssl?.key || undefined,
                rejectUnauthorized: input.ssl?.rejectUnauthorized ?? true,
              }
            : {}),
        },
        response => {
          const chunks: Buffer[] = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            const status = response.statusCode ?? 0;

            if (status < 200 || status >= 300) {
              reject(toHttpError(status, path, text));
              return;
            }

            try {
              resolve((text ? JSON.parse(text) : {}) as T);
            } catch {
              reject(
                new BrokerConnectionError(
                  'The server did not answer like a RabbitMQ Management API.',
                  'Check that the port points to the Management plugin (default 15672), not the AMQP port 5672.',
                  'RABBITMQ_NOT_JSON',
                  text.slice(0, 500)
                )
              );
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(
          Object.assign(new Error('RabbitMQ request timed out'), {
            code: 'ETIMEDOUT',
          })
        );
      });
      req.on('error', reject);

      if (payload) req.write(payload);
      req.end();
    });

  return {
    get: (path, query) => request('GET', `${path}${buildQueryString(query)}`),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path, headers) => request('DELETE', path, undefined, headers),
    close: async () => {
      if (closeTunnel) await closeTunnel();
    },
  };
}

export async function withRabbitManagement<T>(
  input: BrokerConnectionInput,
  run: (client: RabbitManagementClient) => Promise<T>
) {
  const client = await createRabbitManagementClient(input);

  try {
    return await run(client);
  } finally {
    await client.close();
  }
}

/** Admin-only endpoints answer 401 "Not administrator" to other users. */
export const isRabbitPermissionError = (error: unknown) =>
  error instanceof BrokerConnectionError &&
  (error.code === 'RABBITMQ_401' || error.code === 'RABBITMQ_403');

/**
 * Run a change that needs a management tag and explain a 401/403 instead of
 * showing the raw "Not administrator" answer.
 */
export function withRabbitTaggedAction<T>(
  input: BrokerConnectionInput,
  action: string,
  run: (client: RabbitManagementClient) => Promise<T>,
  requiredTag = 'administrator'
) {
  return withRabbitManagement(input, async client => {
    try {
      return await run(client);
    } catch (error) {
      if (!isRabbitPermissionError(error)) throw error;
      throw new BrokerConnectionError(
        `${action} needs the "${requiredTag}" tag on this RabbitMQ user.`,
        undefined,
        'RABBITMQ_FORBIDDEN'
      );
    }
  });
}
