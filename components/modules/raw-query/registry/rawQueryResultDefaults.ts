import { defineAsyncComponent, type Component } from 'vue';
import ResultTabErrorView from '../components/result-tab/ResultTabErrorView.vue';
import ResultTabInfoView from '../components/result-tab/ResultTabInfoView.vue';
import ResultTabRawView from '../components/result-tab/ResultTabRawView.vue';
import ResultTabResultView from '../components/result-tab/ResultTabResultView.vue';
import { ViewMode } from '../interfaces';
import {
  RawQueryResultExecutionPolicy,
  type RawQueryContext,
  type RawQueryResultProfile,
  type RawQueryResultTabDefinition,
  type RawQueryResultViewAvailability,
  type RawQueryResultViewDefinition,
  type ResolvedRawQueryResultViewDefinition,
} from './rawQueryProfile.types';

const ResultTabChartRenderer = defineAsyncComponent(
  () => import('../components/result-tab/adapters/ResultTabChartRenderer.vue')
);
const ResultTabExplainRenderer = defineAsyncComponent(
  () => import('../components/result-tab/adapters/ResultTabExplainRenderer.vue')
);

export const RAW_QUERY_RESULT_VIEW_LABELS: Record<ViewMode, string> = {
  [ViewMode.RESULT]: 'Result',
  [ViewMode.ERROR]: 'Errors',
  [ViewMode.INFO]: 'Info',
  [ViewMode.RAW]: 'Raw',
  [ViewMode.EXPLAIN]: 'Explain',
  [ViewMode.CHART]: 'Chart',
  [ViewMode.CONSOLE]: 'Console',
};

export const DEFAULT_RAW_QUERY_RESULT_RENDERERS: Partial<
  Record<ViewMode, Component>
> = {
  [ViewMode.RESULT]: ResultTabResultView,
  [ViewMode.RAW]: ResultTabRawView,
  [ViewMode.INFO]: ResultTabInfoView,
  [ViewMode.ERROR]: ResultTabErrorView,
  [ViewMode.CHART]: ResultTabChartRenderer,
  [ViewMode.EXPLAIN]: ResultTabExplainRenderer,
};

export function defineRawQueryResultView(
  mode: ViewMode,
  options: Partial<Omit<RawQueryResultViewDefinition, 'mode'>> & {
    component?: Component;
  } = {}
): RawQueryResultViewDefinition {
  const renderer =
    options.component ??
    options.renderer ??
    DEFAULT_RAW_QUERY_RESULT_RENDERERS[mode];
  if (!renderer) {
    throw new Error(`No renderer registered for raw-query view "${mode}"`);
  }

  return {
    mode,
    label: options.label ?? RAW_QUERY_RESULT_VIEW_LABELS[mode],
    renderer,
    component: renderer,
    availability: options.availability,
  };
}

function isViewDefinitionList(
  value: unknown
): value is readonly RawQueryResultViewDefinition[] {
  return Array.isArray(value);
}

export function defineRawQueryResultProfile(
  viewsOrOptions:
    | readonly RawQueryResultViewDefinition[]
    | {
        views?: readonly RawQueryResultViewDefinition[];
        tabs?: readonly RawQueryResultTabDefinition[];
      }
): RawQueryResultProfile {
  const views: readonly RawQueryResultViewDefinition[] = isViewDefinitionList(
    viewsOrOptions
  )
    ? viewsOrOptions
    : (viewsOrOptions.tabs ?? viewsOrOptions.views ?? []);

  if (!views.length) {
    throw new Error('Raw-query result profile must contain at least one view');
  }

  return {
    views,
    tabs: views,
  };
}

export function resolveRawQueryResultViews(
  profile: RawQueryResultProfile,
  context: RawQueryContext
): ResolvedRawQueryResultViewDefinition[] {
  return profile.views.map(view => ({
    ...view,
    availabilityState: resolveRawQueryResultViewAvailability(view, context),
  }));
}

export function resolveRawQueryResultViewAvailability(
  definition: RawQueryResultViewDefinition,
  context: RawQueryContext
): RawQueryResultViewAvailability {
  const config = definition.availability;
  const execution = config?.execution ?? RawQueryResultExecutionPolicy.ALWAYS;
  const hasError = Boolean(context.activeTab?.metadata?.executeErrors);

  if (execution === RawQueryResultExecutionPolicy.SUCCESS_ONLY && hasError) {
    return {
      enabled: false,
      reason:
        config?.disabledReason ?? 'This view requires a successful execution',
    };
  }

  if (execution === RawQueryResultExecutionPolicy.ERROR_ONLY && !hasError) {
    return {
      enabled: false,
      reason: config?.disabledReason ?? 'This view requires an execution error',
    };
  }

  try {
    return config?.when?.(context) ?? { enabled: true };
  } catch (error) {
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      throw error;
    }

    return { enabled: false, reason: 'This view is unavailable' };
  }
}

export function resolveActiveRawQueryResultView(
  views: readonly ResolvedRawQueryResultViewDefinition[],
  requestedMode: ViewMode,
  hasError: boolean
): ResolvedRawQueryResultViewDefinition | null {
  if (hasError) {
    const errorView = views.find(
      view => view.mode === ViewMode.ERROR && view.availabilityState.enabled
    );
    if (errorView) return errorView;
  }

  const requestedView = views.find(
    view => view.mode === requestedMode && view.availabilityState.enabled
  );
  if (requestedView) return requestedView;

  const resultView = views.find(
    view => view.mode === ViewMode.RESULT && view.availabilityState.enabled
  );
  if (resultView) return resultView;

  return views.find(view => view.availabilityState.enabled) ?? views[0] ?? null;
}
