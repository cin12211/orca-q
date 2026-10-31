import {
  BrokerConnectionError,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  rabbitApiPath,
  withRabbitManagement,
} from './rabbitmq-management.client';
import { asRecord } from './rabbitmq-mappers';

export type RabbitDefinitions = Record<string, unknown>;

const SINGLE_VHOST_FORMAT = 'single_virtual_host';

const definitionsPath = (vhost?: string) =>
  vhost ? rabbitApiPath('definitions', vhost) : rabbitApiPath('definitions');

const toForbiddenError = (error: unknown, action: string) => {
  if (
    error instanceof BrokerConnectionError &&
    (error.code === 'RABBITMQ_401' || error.code === 'RABBITMQ_403')
  ) {
    return new BrokerConnectionError(
      `${action} definitions needs the "administrator" tag on this RabbitMQ user.`,
      undefined,
      'RABBITMQ_DEFINITIONS_FORBIDDEN'
    );
  }

  return error;
};

/** Whole-broker export, or a single vhost when `vhost` is given. */
export async function exportRabbitDefinitions(
  input: BrokerConnectionInput,
  vhost?: string
): Promise<RabbitDefinitions> {
  return withRabbitManagement(input, async client => {
    try {
      return await client.get<RabbitDefinitions>(definitionsPath(vhost));
    } catch (error) {
      throw toForbiddenError(error, 'Exporting');
    }
  });
}

/**
 * Import merges definitions into the broker: existing objects are kept and
 * matching ones updated; nothing is deleted. A single-vhost file must be
 * imported into a chosen vhost.
 */
export async function importRabbitDefinitions(
  input: BrokerConnectionInput,
  definitions: RabbitDefinitions,
  vhost?: string
) {
  const isSingleVhost =
    asRecord(definitions).rabbitmq_definition_format === SINGLE_VHOST_FORMAT;

  if (isSingleVhost && !vhost) {
    throw new BrokerConnectionError(
      'This file holds the definitions of one virtual host.',
      'Choose the virtual host to import it into.'
    );
  }

  return withRabbitManagement(input, async client => {
    try {
      await client.post(
        definitionsPath(isSingleVhost ? vhost : undefined),
        definitions
      );
      return { imported: true };
    } catch (error) {
      throw toForbiddenError(error, 'Importing');
    }
  });
}
