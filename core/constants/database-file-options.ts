import { DatabaseClientType } from './database-client-type';

export interface DatabaseFileOptions {
  journalMode?: string;
  pageSize?: string;
  encoding?: string;
  autoVacuum?: string;
  storageVersion?: string;
  blockSize?: string;
}

export interface DatabaseFileOptionField {
  key: keyof DatabaseFileOptions;
  label: string;
  description: string;
  defaultValue: string;
  choices: { value: string; label: string }[];
}

const SQLITE_FILE_OPTION_FIELDS: DatabaseFileOptionField[] = [
  {
    key: 'journalMode',
    label: 'Journal mode',
    description: 'WAL allows reads during writes but adds -wal and -shm files.',
    defaultValue: 'DELETE',
    choices: [
      { value: 'DELETE', label: 'DELETE (single file)' },
      { value: 'WAL', label: 'WAL' },
    ],
  },
  {
    key: 'pageSize',
    label: 'Page size',
    description: 'Fixed for the life of the file unless it is rebuilt.',
    defaultValue: '4096',
    choices: ['1024', '2048', '4096', '8192', '16384', '32768', '65536'].map(
      value => ({ value, label: `${Number(value) / 1024} KB` })
    ),
  },
  {
    key: 'encoding',
    label: 'Text encoding',
    description: 'Cannot be changed after the file is created.',
    defaultValue: 'UTF-8',
    choices: [
      { value: 'UTF-8', label: 'UTF-8' },
      { value: 'UTF-16', label: 'UTF-16' },
    ],
  },
  {
    key: 'autoVacuum',
    label: 'Auto vacuum',
    description: 'Reclaims space from deleted rows automatically.',
    defaultValue: 'NONE',
    choices: [
      { value: 'NONE', label: 'None' },
      { value: 'FULL', label: 'Full' },
      { value: 'INCREMENTAL', label: 'Incremental' },
    ],
  },
];

const DUCKDB_FILE_OPTION_FIELDS: DatabaseFileOptionField[] = [
  {
    key: 'storageVersion',
    label: 'Compatible with',
    description: 'Older DuckDB versions can only open files written for them.',
    defaultValue: 'latest',
    choices: [
      { value: 'latest', label: 'Latest DuckDB' },
      { value: 'v1.4.0', label: 'DuckDB 1.4 and newer' },
      { value: 'v1.0.0', label: 'DuckDB 1.0 and newer' },
    ],
  },
  {
    key: 'blockSize',
    label: 'Block size',
    description: 'Fixed for the life of the file.',
    defaultValue: '262144',
    choices: [
      { value: '262144', label: '256 KB' },
      { value: '16384', label: '16 KB' },
    ],
  },
];

export function getDatabaseFileOptionFields(
  type: DatabaseClientType
): DatabaseFileOptionField[] {
  return type === DatabaseClientType.DUCKDB
    ? DUCKDB_FILE_OPTION_FIELDS
    : SQLITE_FILE_OPTION_FIELDS;
}

export function getDefaultDatabaseFileOptions(
  type: DatabaseClientType
): DatabaseFileOptions {
  return Object.fromEntries(
    getDatabaseFileOptionFields(type).map(field => [
      field.key,
      field.defaultValue,
    ])
  );
}
