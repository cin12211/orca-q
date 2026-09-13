import { describe, expect, it } from 'vitest';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import type { RawQueryResultViewContext } from '~/components/modules/raw-query/registry/rawQueryResult.types';
import {
  DEFAULT_RAW_QUERY_RESULT_RENDERERS,
  resolveRawQueryResultViewAvailability,
} from '~/components/modules/raw-query/registry/rawQueryResultDefaults';
import {
  RAW_QUERY_RESULT_REGISTRY,
  getRawQueryResultProfile,
} from '~/components/modules/raw-query/registry/rawQueryResultRegistry';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const modesFor = (databaseType: DatabaseClientType) =>
  getRawQueryResultProfile(databaseType).views.map(view => view.mode);

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

describe('raw query result registry', () => {
  it('registers every DatabaseClientType', () => {
    expect(Object.keys(RAW_QUERY_RESULT_REGISTRY).sort()).toEqual(
      Object.values(DatabaseClientType).sort()
    );
  });

  it('uses the approved PostgreSQL view order', () => {
    expect(modesFor(DatabaseClientType.POSTGRES)).toEqual([
      ViewMode.RESULT,
      ViewMode.EXPLAIN,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CHART,
      ViewMode.ERROR,
    ]);
  });

  it('hides Explain and Chart for Redis', () => {
    expect(modesFor(DatabaseClientType.REDIS)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.ERROR,
    ]);
  });

  it('uses Console instead of Chart for MongoDB', () => {
    expect(modesFor(DatabaseClientType.MONGODB)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CONSOLE,
      ViewMode.ERROR,
    ]);
  });

  it('reuses the default Raw renderer for MongoDB', () => {
    const raw = getRawQueryResultProfile(DatabaseClientType.MONGODB).views.find(
      view => view.mode === ViewMode.RAW
    );
    expect(raw?.renderer).toBe(
      DEFAULT_RAW_QUERY_RESULT_RENDERERS[ViewMode.RAW]
    );
  });

  it.each([
    DatabaseClientType.MYSQL,
    DatabaseClientType.MYSQL2,
    DatabaseClientType.MARIADB,
    DatabaseClientType.SQLITE3,
    DatabaseClientType.BETTER_SQLITE3,
    DatabaseClientType.MSSQL,
    DatabaseClientType.ORACLE,
    DatabaseClientType.SNOWFLAKE,
  ])('configures standard SQL view order for %s', databaseType => {
    expect(modesFor(databaseType)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CHART,
      ViewMode.ERROR,
    ]);
  });

  it('enables Explain view for PostgreSQL only when statement starts with EXPLAIN', () => {
    const profile = getRawQueryResultProfile(DatabaseClientType.POSTGRES);
    const explainView = profile.views.find(v => v.mode === ViewMode.EXPLAIN);
    expect(explainView).toBeDefined();

    const nonExplainContext = createContext({
      activeTab: {
        ...createContext().activeTab,
        metadata: {
          ...createContext().activeTab.metadata,
          statementQuery: 'SELECT * FROM users',
        },
      },
    });

    expect(
      resolveRawQueryResultViewAvailability(explainView!, nonExplainContext)
    ).toEqual({
      enabled: false,
      reason: 'Available only for EXPLAIN queries',
    });

    const explainContext = createContext({
      activeTab: {
        ...createContext().activeTab,
        metadata: {
          ...createContext().activeTab.metadata,
          statementQuery: '  explain ANALYZE SELECT * FROM users',
        },
      },
    });

    expect(
      resolveRawQueryResultViewAvailability(explainView!, explainContext)
    ).toEqual({
      enabled: true,
    });
  });

  it('exposes tabs alias matching views on every profile', () => {
    Object.values(DatabaseClientType).forEach(dbType => {
      const profile = getRawQueryResultProfile(dbType);
      expect(profile.tabs).toBeDefined();
      expect(profile.tabs).toEqual(profile.views);
    });
  });
});
