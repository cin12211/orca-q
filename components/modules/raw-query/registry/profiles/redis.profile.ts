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
 * Redis Raw Query Result Profile
 * Tabs: Result, Raw, Info, Error (no Explain or Chart)
 * Each tab maps to its dedicated renderer component dynamically.
 */
export const redisProfile: RawQueryResultProfile = defineRawQueryResultProfile({
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
      availability: { execution: 'always' },
    }),
    defineRawQueryResultView(ViewMode.ERROR, {
      component: DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.ERROR],
      availability: errorOnly,
    }),
  ],
});
