import { defineAsyncComponent } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { ViewMode } from '../../interfaces';
import {
  RawQueryResultExecutionPolicy,
  type RawQueryProfile,
  type RawQueryResultProfile,
} from '../rawQueryProfile.types';
import {
  DEFAULT_RAW_QUERY_RESULT_RENDERERS,
  defineRawQueryResultProfile,
  defineRawQueryResultView,
} from '../rawQueryResultDefaults';

const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
);
const lazySqlGuide = defineAsyncComponent(
  () => import('../../components/common/RawQueryVariableUsageGuidePopover.vue')
);
const lazySqlFormatAction = defineAsyncComponent(
  () => import('../../components/common/RawQuerySqlFormatAction.vue')
);
const lazyExecuteAction = defineAsyncComponent(
  () => import('../../components/common/RawQueryExecuteAction.vue')
);

const successOnly = {
  execution: RawQueryResultExecutionPolicy.SUCCESS_ONLY,
  disabledReason: 'The query execution contains an error',
};

const errorOnly = {
  execution: RawQueryResultExecutionPolicy.ERROR_ONLY,
  disabledReason: 'This execution has no errors',
};

/**
 * Standard SQL Raw Query Result Profile
 * Used for MySQL, MySQL2, MariaDB, SQLite3, Better SQLite3, MSSQL, Oracle, Snowflake
 * Tabs: Result, Raw, Info, Chart, Error
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const createStandardSqlResultProfile = (): RawQueryResultProfile =>
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

/**
 * Master Standard SQL Raw Query Profile
 */
export const createStandardSqlRawQueryProfile = (
  databaseType: DatabaseClientType = DatabaseClientType.MYSQL
): RawQueryProfile => {
  const isSqlite =
    databaseType === DatabaseClientType.SQLITE3 ||
    databaseType === DatabaseClientType.BETTER_SQLITE3;

  return {
    databaseType,
    isFormatSupported: true,
    isVariableSupported: !isSqlite,
    header: {},
    footer: {
      leftComponents: isSqlite
        ? [lazyCursorInfo]
        : [lazyCursorInfo, lazySqlGuide],
      rightComponents: [lazySqlFormatAction, lazyExecuteAction],
    },
    result: createStandardSqlResultProfile(),
  };
};
