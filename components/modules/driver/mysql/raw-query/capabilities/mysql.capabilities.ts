import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const MYSQL_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.MYSQL),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.MYSQL),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
