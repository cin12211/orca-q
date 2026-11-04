import type { RabbitDefinitionsSummary } from '~/core/types/rabbitmq.types';

/** Sections of a definitions file worth counting before import/export. */
const COUNTED_SECTIONS = [
  'vhosts',
  'users',
  'permissions',
  'topic_permissions',
  'queues',
  'exchanges',
  'bindings',
  'policies',
  'parameters',
  'global_parameters',
] as const;

/** Read a parsed definitions JSON into format, version and item counts. */
export function summarizeRabbitDefinitions(
  definitions: Record<string, unknown>
): RabbitDefinitionsSummary {
  const format = definitions.rabbitmq_definition_format;
  const version =
    definitions.rabbitmq_version ?? definitions.rabbit_version ?? null;
  const counts: Record<string, number> = {};

  for (const section of COUNTED_SECTIONS) {
    const value = definitions[section];
    if (Array.isArray(value)) counts[section] = value.length;
  }

  return {
    format:
      format === 'cluster' || format === 'single_virtual_host'
        ? format
        : 'unknown',
    rabbitmqVersion: typeof version === 'string' ? version : null,
    counts,
  };
}

/** Looks like a definitions file: an object with at least one known section. */
export function isRabbitDefinitions(
  value: unknown
): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return COUNTED_SECTIONS.some(section =>
    Array.isArray((value as Record<string, unknown>)[section])
  );
}

export const formatDefinitionsSection = (section: string) =>
  section.replace(/_/g, ' ');
