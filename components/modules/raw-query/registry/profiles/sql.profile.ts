import { ViewMode } from '../../interfaces';
import type { RawQueryResultProfile } from '../rawQueryResult.types';
import {
  DEFAULT_RAW_QUERY_RESULT_RENDERERS,
  defineRawQueryResultProfile,
  defineRawQueryResultView,
} from '../rawQueryResultDefaults';

const successOnly = {
  execution: 'success-only' as const,
  disabledReason: 'The query execution contains an error',
};

const errorOnly = {
  execution: 'error-only' as const,
  disabledReason: 'This execution has no errors',
};

/**
 * Standard SQL Raw Query Result Profile
 * Used for MySQL, MySQL2, MariaDB, SQLite3, Better SQLite3, MSSQL, Oracle, Snowflake
 * Tabs: Result, Raw, Info, Chart, Error
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const createStandardSqlProfile = (): RawQueryResultProfile =>
  defineRawQueryResultProfile({
    tabs: [
      defineRawQueryResultView(ViewMode.RESULT, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RESULT],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.RAW, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.INFO, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.INFO],
      }),
      defineRawQueryResultView(ViewMode.CHART, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.CHART],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.ERROR, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
        availability: errorOnly,
      }),
    ],
  });
