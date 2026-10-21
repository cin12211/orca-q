import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const MARIADB_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.MARIADB),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.MARIADB),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
