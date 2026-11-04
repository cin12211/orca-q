import type { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';

export type AIProvider =
  | 'openai'
  | 'google'
  | 'anthropic'
  | 'xai'
  | 'openrouter';
export type DatabaseAdapter = Awaited<ReturnType<typeof getDatabaseSource>>;

export interface QueryField {
  name?: string;
  dataTypeID?: number | string;
}

export interface RawQueryResult {
  rows?: unknown[];
  fields?: QueryField[];
  rowCount?: number;
  command?: string;
}

export type QueryRowRecord = Record<string, unknown>;

export type QueryPlan = Record<string, unknown> & {
  Plans?: QueryPlan[];
};
