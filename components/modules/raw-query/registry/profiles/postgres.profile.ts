import { ViewMode } from '../../interfaces';
import {
  RawQueryResultExecutionPolicy,
  type RawQueryResultProfile,
} from '../rawQueryResult.types';
import {
  DEFAULT_RAW_QUERY_RESULT_RENDERERS,
  defineRawQueryResultProfile,
  defineRawQueryResultView,
} from '../rawQueryResultDefaults';

const successOnly = {
  execution: RawQueryResultExecutionPolicy.SUCCESS_ONLY,
  disabledReason: 'The query execution contains an error',
};

const errorOnly = {
  execution: RawQueryResultExecutionPolicy.ERROR_ONLY,
  disabledReason: 'This execution has no errors',
};

/**
 * PostgreSQL Raw Query Result Profile
 * Tabs: Result, Explain, Raw, Info, Chart, Error
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const postgresProfile: RawQueryResultProfile =
  defineRawQueryResultProfile({
    tabs: [
      defineRawQueryResultView(ViewMode.RESULT, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RESULT],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.EXPLAIN, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.EXPLAIN],
        availability: {
          ...successOnly,
          when: context =>
            context.activeTab.metadata.statementQuery
              ?.trimStart()
              .toUpperCase()
              .startsWith('EXPLAIN')
              ? { enabled: true }
              : {
                  enabled: false,
                  reason: 'Available only for EXPLAIN queries',
                },
        },
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
