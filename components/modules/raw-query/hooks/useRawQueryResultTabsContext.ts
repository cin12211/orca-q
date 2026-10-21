import type { InjectionKey } from 'vue';
import type { ResultTabsReturn } from './useResultTabs';
import { useResultTabs } from './useResultTabs';

const RAW_QUERY_RESULT_TABS_KEY: InjectionKey<ResultTabsReturn> =
  Symbol('rawQueryResultTabs');

/**
 * Creates (or adopts) the single result-tab instance for the raw query page and
 * hands it to every descendant. The page picks the engine entry from the
 * selected connection, so switching to a connection of another engine swaps the
 * entry component; without this the shell's own tabs would be dropped on that
 * swap.
 */
export function provideRawQueryResultTabs(
  instance?: ResultTabsReturn
): ResultTabsReturn {
  const resultTabs = instance ?? useResultTabs();

  provide(RAW_QUERY_RESULT_TABS_KEY, resultTabs);

  return resultTabs;
}

/**
 * Reads the shared instance. Falls back to a private one so consumers mounted
 * without a provider keep behaving exactly as before.
 */
export function useRawQueryResultTabsContext(): ResultTabsReturn {
  return (
    inject<ResultTabsReturn | null>(RAW_QUERY_RESULT_TABS_KEY, null) ??
    useResultTabs()
  );
}
