import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

// MSSQL has no entry in SQL_DIALECT_BY_DB_TYPE, so both resolvers fall back to
// the PostgreSQL dialect. Recorded explicitly rather than changed.
export const MSSQL_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.MSSQL),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.MSSQL),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'at',
};
