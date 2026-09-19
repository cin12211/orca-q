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

const lazyRedisHeaderExtension = defineAsyncComponent(
  () => import('../../components/redis/RawQueryRedisHeaderExtension.vue')
);
const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
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
 * Redis Raw Query Result Profile
 * Tabs: Result, Raw, Info, Error (no Explain or Chart)
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const redisResultProfile: RawQueryResultProfile =
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
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.ERROR, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
        availability: errorOnly,
      }),
    ],
  });

/**
 * Master Redis Profile
 */
export const redisRawQueryProfile: RawQueryProfile = {
  databaseType: DatabaseClientType.REDIS,
  isFormatSupported: false,
  isVariableSupported: false,
  header: {
    rightComponents: [lazyRedisHeaderExtension],
  },
  footer: {
    leftComponents: [lazyCursorInfo],
    rightComponents: [lazyExecuteAction],
  },
  result: redisResultProfile,
};
