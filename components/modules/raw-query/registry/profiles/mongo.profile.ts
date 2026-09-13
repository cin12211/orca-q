import { defineAsyncComponent } from 'vue';
import { ViewMode } from '../../interfaces';
import type { RawQueryResultProfile } from '../rawQueryResult.types';
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

const successOnly = {
  execution: 'success-only' as const,
  disabledReason: 'The query execution contains an error',
};

const errorOnly = {
  execution: 'error-only' as const,
  disabledReason: 'This execution has no errors',
};

/**
 * MongoDB Raw Query Result Profile
 * Tabs: Result (Mongo document renderer), Raw, Info, Console (Mongo console), Error
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const mongoProfile: RawQueryResultProfile = defineRawQueryResultProfile({
  tabs: [
    defineRawQueryResultView(ViewMode.RESULT, {
      component: MongoResultTabRenderer,
      availability: { execution: 'always' },
    }),
    defineRawQueryResultView(ViewMode.RAW, {
      component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW],
      availability: successOnly,
    }),
    defineRawQueryResultView(ViewMode.INFO, {
      component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.INFO],
      availability: { execution: 'always' },
    }),
    defineRawQueryResultView(ViewMode.CONSOLE, {
      component: MongoConsoleTabRenderer,
      availability: { execution: 'always' },
    }),
    defineRawQueryResultView(ViewMode.ERROR, {
      component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
      availability: errorOnly,
    }),
  ],
});
