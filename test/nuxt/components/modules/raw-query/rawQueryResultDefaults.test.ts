import { describe, expect, it } from 'vitest';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import {
  RawQueryResultExecutionPolicy,
  type RawQueryResultViewContext,
} from '~/components/modules/raw-query/registry';
import {
  defineRawQueryResultProfile,
  defineRawQueryResultView,
  resolveActiveRawQueryResultView,
  resolveRawQueryResultViewAvailability,
  resolveRawQueryResultViews,
} from '~/components/modules/raw-query/registry/rawQueryResultDefaults';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const createContext = (
  overrides: Partial<RawQueryResultViewContext> = {}
): RawQueryResultViewContext => ({
  activeTab: {
    id: 'result-1',
    metadata: {
      queryTime: 10,
      statementQuery: 'SELECT 1',
      executedAt: new Date('2026-09-13T00:00:00.000Z'),
      executeErrors: undefined,
      connection: {
        id: 'connection-1',
        workspaceId: 'workspace-1',
        type: DatabaseClientType.POSTGRES,
      } as RawQueryResultViewContext['activeTab']['metadata']['connection'],
    },
    result: [{ value: 1 }],
    seqIndex: 1,
    view: ViewMode.RESULT,
  },
  databaseType: DatabaseClientType.POSTGRES,
  activeTabColumns: [],
  formattedData: [{ value: 1 }],
  executeLoading: false,
  isStreaming: false,
  changeView: () => undefined,
  ...overrides,
});

describe('raw query result defaults', () => {
  it('rejects a configured mode without a default or override renderer', () => {
    expect(() => defineRawQueryResultView(ViewMode.CONSOLE)).toThrow(
      'No renderer registered for raw-query view "console"'
    );
  });

  it('rejects an empty result profile', () => {
    expect(() => defineRawQueryResultProfile([])).toThrow(
      'Raw-query result profile must contain at least one view'
    );
  });

  it.each([
    [RawQueryResultExecutionPolicy.ALWAYS, false, true],
    [RawQueryResultExecutionPolicy.ALWAYS, true, true],
    [RawQueryResultExecutionPolicy.SUCCESS_ONLY, false, true],
    [RawQueryResultExecutionPolicy.SUCCESS_ONLY, true, false],
    [RawQueryResultExecutionPolicy.ERROR_ONLY, false, false],
    [RawQueryResultExecutionPolicy.ERROR_ONLY, true, true],
  ] as const)(
    'resolves %s with hasError=%s to enabled=%s',
    (execution, hasError, enabled) => {
      const definition = defineRawQueryResultView(ViewMode.RESULT, {
        availability: {
          execution,
          disabledReason: 'Unavailable for this execution',
        },
      });
      const context = createContext();
      context.activeTab.metadata.executeErrors = hasError
        ? { message: 'boom', data: { message: 'boom' } }
        : undefined;

      expect(
        resolveRawQueryResultViewAvailability(definition, context)
      ).toMatchObject({ enabled });
    }
  );

  it('applies the custom predicate after execution policy passes', () => {
    const definition = defineRawQueryResultView(ViewMode.RESULT, {
      availability: {
        execution: RawQueryResultExecutionPolicy.SUCCESS_ONLY,
        when: context =>
          context.activeTab.metadata.statementQuery.startsWith('EXPLAIN')
            ? { enabled: true }
            : { enabled: false, reason: 'Not an EXPLAIN statement' },
      },
    });

    expect(
      resolveRawQueryResultViewAvailability(definition, createContext())
    ).toEqual({ enabled: false, reason: 'Not an EXPLAIN statement' });
  });

  it('prefers the enabled error view when execution failed', () => {
    const context = createContext();
    context.activeTab.metadata.executeErrors = {
      message: 'boom',
      data: { message: 'boom' },
    };
    const profile = defineRawQueryResultProfile([
      defineRawQueryResultView(ViewMode.RESULT, {
        availability: { execution: RawQueryResultExecutionPolicy.SUCCESS_ONLY },
      }),
      defineRawQueryResultView(ViewMode.INFO),
      defineRawQueryResultView(ViewMode.ERROR, {
        availability: { execution: RawQueryResultExecutionPolicy.ERROR_ONLY },
      }),
    ]);
    const views = resolveRawQueryResultViews(profile, context);

    expect(
      resolveActiveRawQueryResultView(views, ViewMode.RESULT, true)?.mode
    ).toBe(ViewMode.ERROR);
  });

  it('falls back to Result and then the first enabled view', () => {
    const context = createContext();
    const profile = defineRawQueryResultProfile([
      defineRawQueryResultView(ViewMode.INFO),
      defineRawQueryResultView(ViewMode.RESULT),
    ]);
    const views = resolveRawQueryResultViews(profile, context);

    expect(
      resolveActiveRawQueryResultView(views, ViewMode.CONSOLE, false)?.mode
    ).toBe(ViewMode.RESULT);
  });
});
