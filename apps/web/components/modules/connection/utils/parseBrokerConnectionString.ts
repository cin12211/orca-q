import { parseConnectionString } from '~/core/helpers/parser-connection-string';
import { EKafkaSaslMechanism, type IBrokerConfig } from '../types';
import { parseBrokerList } from './parseBrokerList';

/** What a broker connection string resolves to before it is saved. */
export interface ParsedBrokerConnection {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  useTls: boolean;
  broker: IBrokerConfig;
}

const RABBIT_MANAGEMENT_PORT = '15672';
const RABBIT_MANAGEMENT_TLS_PORT = '15671';
const KAFKA_SCHEMES = ['kafka://', 'kafka+ssl://'];
const KAFKA_SASL_VALUES = Object.values(EKafkaSaslMechanism) as string[];

/**
 * `amqp(s)://user:pass@host[:port]/vhost[?management_port=15672]`.
 * The AMQP port is ignored: OrcaQ talks to the Management API, which listens
 * on 15672 (15671 over TLS) unless `management_port` says otherwise.
 */
export function parseRabbitConnectionString(
  value: string
): ParsedBrokerConnection {
  const parsed = parseConnectionString(value);
  const useTls = value.trim().toLowerCase().startsWith('amqps:');

  return {
    host: parsed.host,
    port:
      parsed.options.management_port ||
      (useTls ? RABBIT_MANAGEMENT_TLS_PORT : RABBIT_MANAGEMENT_PORT),
    username: parsed.username,
    password: parsed.password,
    useTls,
    broker: { rabbitmq: { vhost: parsed.database || '/' } },
  };
}

/**
 * `kafka://[user:pass@]host:port[,host:port][?sasl=PLAIN&ssl=true]`, or a
 * bare broker list. `kafka+ssl://` turns TLS on.
 */
export function parseKafkaConnectionString(
  value: string
): ParsedBrokerConnection {
  let rest = value.trim();
  const scheme = KAFKA_SCHEMES.find(item =>
    rest.toLowerCase().startsWith(item)
  );
  let useTls = scheme === 'kafka+ssl://';

  if (scheme) rest = rest.slice(scheme.length);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rest)) {
    throw new Error(
      'Kafka connection strings start with kafka:// or kafka+ssl://.'
    );
  }

  const [authority, query = ''] = rest.split('?');
  const atIndex = authority.lastIndexOf('@');
  const credentials = atIndex >= 0 ? authority.slice(0, atIndex) : '';
  const hosts = atIndex >= 0 ? authority.slice(atIndex + 1) : authority;
  const brokers = parseBrokerList(hosts.replace(/\/+$/, ''));
  const params = new URLSearchParams(query);
  const sasl = params.get('sasl')?.toUpperCase();

  if (!brokers.length) {
    throw new Error(
      'Add at least one broker, for example kafka://localhost:9092.'
    );
  }

  if (sasl && !KAFKA_SASL_VALUES.includes(sasl)) {
    throw new Error(
      `Unsupported sasl "${sasl}". Use PLAIN, SCRAM-SHA-256 or SCRAM-SHA-512.`
    );
  }

  if (params.get('ssl') === 'true' || params.get('tls') === 'true')
    useTls = true;

  const [rawUser, ...passwordParts] = credentials ? credentials.split(':') : [];
  const username = rawUser ? decodeURIComponent(rawUser) : undefined;
  const password = passwordParts.length
    ? decodeURIComponent(passwordParts.join(':'))
    : undefined;

  return {
    username,
    password,
    useTls,
    broker: {
      kafka: {
        brokers,
        saslMechanism:
          (sasl as EKafkaSaslMechanism | undefined) ??
          (username ? EKafkaSaslMechanism.PLAIN : EKafkaSaslMechanism.NONE),
      },
    },
  };
}
