import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const POSTGRES_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.POSTGRES),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.POSTGRES),
  keywordCompletion: pgKeywordCompletion,
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
