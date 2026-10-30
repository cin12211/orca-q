import {
  getKafkaFixtureConfig,
  getRabbitMqFixtureConfig,
} from '../../support/db-fixtures';

/**
 * Plain values instead of enums: the integration runner does not resolve the
 * `~` alias.
 */
const FORM_METHOD = 'form';

const rabbit = getRabbitMqFixtureConfig();
const kafka = getKafkaFixtureConfig();

export function rabbitConnection(overrides: Record<string, unknown> = {}) {
  return {
    method: FORM_METHOD,
    host: rabbit.host,
    port: `${rabbit.managementPort}`,
    username: rabbit.username,
    password: rabbit.password,
    broker: { rabbitmq: { vhost: rabbit.vhost } },
    ...overrides,
  };
}

export function kafkaConnection(overrides: Record<string, unknown> = {}) {
  return {
    method: FORM_METHOD,
    broker: { kafka: { brokers: [`${kafka.host}:${kafka.port}`] } },
    ...overrides,
  };
}

export function kafkaSaslConnection(password = kafka.saslPassword) {
  return {
    method: FORM_METHOD,
    username: kafka.saslUsername,
    password,
    broker: {
      kafka: {
        brokers: [`${kafka.host}:${kafka.saslPort}`],
        saslMechanism: 'PLAIN',
      },
    },
  };
}

export { kafka as kafkaFixture, rabbit as rabbitFixture };
