import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const SQLITE_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.SQLITE3),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.SQLITE3),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
