import { EXPLAIN_ANALYZE_OPTIONS } from '../constants';
import type {
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '../interfaces';

export function useRawQueryExplainAnalyzeOptions() {
  const explainAnalyzeOptions = ref<
    Record<ExplainAnalyzeToggleOptionKey, boolean>
  >({
    BUFFERS: true,
    COSTS: true,
    GENERIC_PLAN: true,
    MEMORY: true,
    SETTINGS: true,
    SUMMARY: true,
    TIMING: true,
    VERBOSE: true,
    WAL: true,
  });

  const serializeMode = ref<ExplainAnalyzeSerializeMode>('TEXT');

  const toggleExplainOption = (option: ExplainAnalyzeToggleOptionKey) => {
    explainAnalyzeOptions.value[option] = !explainAnalyzeOptions.value[option];
  };

  const setSerializeMode = (mode: ExplainAnalyzeSerializeMode) => {
    serializeMode.value = mode;
  };

  const explainAnalyzeOptionItems = computed(() => {
    return EXPLAIN_ANALYZE_OPTIONS.filter(
      option => option.key !== 'SERIALIZE'
    ).map(option => ({
      key: option.key as ExplainAnalyzeToggleOptionKey,
      label: option.label,
      checked:
        explainAnalyzeOptions.value[
          option.key as ExplainAnalyzeToggleOptionKey
        ],
    }));
  });

  const buildExplainAnalyzePrefix = () => {
    const enabledOptions = EXPLAIN_ANALYZE_OPTIONS.filter(
      option =>
        option.key !== 'SERIALIZE' &&
        explainAnalyzeOptions.value[option.key as ExplainAnalyzeToggleOptionKey]
    )
      .map(option => option.key)
      .flatMap(option => {
        if (option === 'GENERIC_PLAN') {
          return [];
        }

        return [option];
      });

    const serializeOption =
      serializeMode.value === 'NONE'
        ? []
        : [`SERIALIZE ${serializeMode.value}`];

    const options = [
      'ANALYZE',
      'FORMAT JSON',
      ...enabledOptions,
      ...serializeOption,
    ].join(', ');

    return `EXPLAIN (${options})`;
  };

  return {
    explainAnalyzeOptionItems,
    serializeMode,
    toggleExplainOption,
    setSerializeMode,
    buildExplainAnalyzePrefix,
  };
}
