import { normalizeSql } from '~/server/infrastructure/agent/core/sql';

const READ_ONLY_LEADING_PATTERN =
  /^(select|with|values|table|show|describe|desc|explain|pragma)\b/i;

/**
 * Keywords that can change data or schema anywhere inside a statement
 * (data-modifying CTEs, EXPLAIN ANALYZE <dml>, SELECT ... INTO, FOR UPDATE).
 * False positives are acceptable: the caller can enable write access.
 */
const WRITE_KEYWORD_PATTERN =
  /\b(insert|update|delete|merge|upsert|drop|truncate|alter|create|grant|revoke|rename|call|exec|execute|copy|lock|vacuum|attach|detach|reindex|set|reset|comment|refresh|load|handler|into|analyze|openrowset|opendatasource|openquery|bulk|waitfor)\b/i;

/** Replace string literals and quoted identifiers so keyword checks only see SQL. */
function blankQuotedSections(sql: string) {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/`(?:[^`]|``)*`/g, '``')
    .replace(/\[[^\]]*\]/g, '[]');
}

export class ReadOnlySqlError extends Error {}

/**
 * First line of defence for read-only MCP access. The database-level
 * read-only transaction in the executor is the real guarantee; this check
 * gives early, readable errors and covers DDL that some engines implicitly
 * commit (MySQL, Oracle).
 */
export function assertReadOnlySql(sql: string): string {
  const normalized = normalizeSql(sql);

  if (!normalized) {
    throw new ReadOnlySqlError('SQL is empty.');
  }

  const unquoted = blankQuotedSections(normalized);

  if (unquoted.includes(';')) {
    throw new ReadOnlySqlError('Only one SQL statement is allowed per call.');
  }

  if (!READ_ONLY_LEADING_PATTERN.test(unquoted)) {
    throw new ReadOnlySqlError(
      'This MCP session has read-only access to this connection. Only SELECT, WITH, SHOW, DESCRIBE, EXPLAIN and PRAGMA statements are allowed.'
    );
  }

  const writeKeyword = unquoted.match(WRITE_KEYWORD_PATTERN)?.[1];

  if (writeKeyword || (/^pragma\b/i.test(unquoted) && unquoted.includes('='))) {
    throw new ReadOnlySqlError(
      `This MCP session has read-only access to this connection and the statement contains "${(writeKeyword ?? '=').toUpperCase()}". Grant this MCP session write access to the connection in OrcaQ Settings → MCP Server to run it.`
    );
  }

  return normalized;
}
