import { z } from 'zod';
import {
  EConnectionMethod,
  EKafkaSaslMechanism,
  ESSLMode,
  type IBrokerConfig,
  type ISSHConfig,
  type ISSLConfig,
} from '~/core/types/entities/connection.entity';
import {
  sshConfigSchema,
  sslConfigSchema,
} from '../redis/parse-connection-body';

/** Connection fields every RabbitMQ / Kafka API route receives. */
export interface BrokerConnectionInput {
  method: EConnectionMethod;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  broker?: IBrokerConfig;
}

export const brokerConnectionSchema = z.object({
  method: z.enum(EConnectionMethod),
  host: z.string().optional(),
  port: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  ssl: sslConfigSchema.optional(),
  ssh: sshConfigSchema.optional(),
  broker: z
    .object({
      rabbitmq: z.object({ vhost: z.string().optional() }).optional(),
      kafka: z
        .object({
          brokers: z.array(z.string()),
          clientId: z.string().optional(),
          saslMechanism: z.enum(EKafkaSaslMechanism).optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Parse `{ connection, ...rest }` request bodies. Each route declares the
 * shape of `rest`; the connection part is shared.
 */
export function parseBrokerBody<T extends z.ZodRawShape>(
  body: unknown,
  shape: T
) {
  return z
    .object({ connection: brokerConnectionSchema, ...shape })
    .parse(body) as z.infer<z.ZodObject<T>> & {
    connection: BrokerConnectionInput;
  };
}

export function isBrokerTlsEnabled(ssl?: ISSLConfig) {
  return Boolean(ssl?.mode && ssl.mode !== ESSLMode.DISABLE);
}

/** A broker error that already carries user-facing wording. */
export class BrokerConnectionError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
    readonly code?: string,
    readonly detail?: string
  ) {
    super(message);
    this.name = 'BrokerConnectionError';
  }
}

/** Compare dotted versions numerically: `compareVersions('3.12.1', '3.12') > 0`. */
export function compareVersions(left: string, right: string) {
  const a = left.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0);
  const b = right.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index++) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}
