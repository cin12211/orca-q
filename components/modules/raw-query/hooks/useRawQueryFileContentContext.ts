import type { InjectionKey } from 'vue';
import { useRawQueryFileContent } from './useRawQueryFileContent';

/** The shape every raw query consumer shares for one opened file. */
export type RawQueryFileContent = ReturnType<typeof useRawQueryFileContent>;

const RAW_QUERY_FILE_CONTENT_KEY: InjectionKey<RawQueryFileContent> = Symbol(
  'rawQueryFileContent'
);

/**
 * Creates (or adopts) the single file-content instance for the raw query page
 * and hands it to every descendant. Without it each consumer would keep its own
 * `selectedConnectionId`, so switching connection in the header would never
 * reach the engine entry or the page.
 */
export function provideRawQueryFileContent(
  instance?: RawQueryFileContent
): RawQueryFileContent {
  const fileContent = instance ?? useRawQueryFileContent();

  provide(RAW_QUERY_FILE_CONTENT_KEY, fileContent);

  return fileContent;
}

/**
 * Reads the shared instance. Falls back to a private one so consumers mounted
 * without a provider keep behaving exactly as before.
 */
export function useRawQueryFileContentContext(): RawQueryFileContent {
  return (
    inject<RawQueryFileContent | null>(RAW_QUERY_FILE_CONTENT_KEY, null) ??
    useRawQueryFileContent()
  );
}
