import { defineAsyncComponent } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { ViewMode } from '../../interfaces';
import { mongoPlugin, type MongoDialectState } from '../plugins/mongo.plugin';
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

const MongoResultTabRenderer = defineAsyncComponent(
  () =>
    import('../../components/result-tab/adapters/MongoResultTabRenderer.vue')
);
const MongoConsoleTabRenderer = defineAsyncComponent(
  () =>
    import('../../components/result-tab/adapters/MongoConsoleTabRenderer.vue')
);
const lazyMongoHeaderBadge = defineAsyncComponent(
  () => import('../../components/mongo/RawQueryMongoHeaderBadge.vue')
);
const lazyCursorInfo = defineAsyncComponent(
  () => import('../../components/common/RawQueryCursorInfo.vue')
);
const lazyMongoGuide = defineAsyncComponent(
  () =>
    import('../../mongo/components/MongoRawQueryVariableUsageGuidePopover.vue')
);
const lazyMongoFormatAction = defineAsyncComponent(
  () => import('../../components/mongo/RawQueryMongoFormatAction.vue')
);
const lazyMongoExecuteAction = defineAsyncComponent(
  () => import('../../components/mongo/RawQueryMongoExecuteAction.vue')
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
 * MongoDB Raw Query Result Profile
 * Tabs: Result (Mongo document renderer), Raw, Info, Console (Mongo console), Error
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const mongoResultProfile: RawQueryResultProfile =
  defineRawQueryResultProfile({
    tabs: [
      defineRawQueryResultView(ViewMode.RESULT, {
        component: MongoResultTabRenderer,
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.RAW, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW],
        availability: successOnly,
      }),
      defineRawQueryResultView(ViewMode.INFO, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.INFO],
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.CONSOLE, {
        component: MongoConsoleTabRenderer,
        availability: { execution: RawQueryResultExecutionPolicy.ALWAYS },
      }),
      defineRawQueryResultView(ViewMode.ERROR, {
        component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
        availability: errorOnly,
      }),
    ],
  });

export type { MongoDialectState };

/**
 * Master MongoDB Profile
 */
export const mongoRawQueryProfile: RawQueryProfile<MongoDialectState> = {
  databaseType: DatabaseClientType.MONGODB,
  plugin: mongoPlugin,
  isFormatSupported: true,
  isVariableSupported: false,
  header: {
    leftComponents: [lazyMongoHeaderBadge],
  },
  footer: {
    leftComponents: [lazyCursorInfo, lazyMongoGuide],
    rightComponents: [lazyMongoFormatAction, lazyMongoExecuteAction],
  },
  result: mongoResultProfile,
};
