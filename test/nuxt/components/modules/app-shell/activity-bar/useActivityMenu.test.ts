import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActivityMenu } from '~/components/modules/app-shell/activity-bar/hooks/useActivityMenu';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  ActivityBarItemType,
  useActivityBarStore,
  useManagementConnectionStore,
} from '~/core/stores';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

const routeMock = vi.hoisted(() => ({
  params: {
    workspaceId: '',
    connectionId: '',
  },
}));

const { trackEventMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

mockNuxtImport('useRoute', () => () => routeMock as any);

mockNuxtImport('useAmplitude', () => () => ({
  initialize: vi.fn(),
  trackEvent: trackEventMock,
  reset: vi.fn(),
}));

describe('useActivityMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    routeMock.params.workspaceId = '';
    routeMock.params.connectionId = '';
  });

  it('includes the database tools activity item', () => {
    const { activity } = useActivityMenu();
    const databaseTools = activity.value.find(
      item => item.id === ActivityBarItemType.DatabaseTools
    );

    expect(databaseTools).toMatchObject({
      id: ActivityBarItemType.DatabaseTools,
      title: 'Database Tools',
    });
  });

  it('activates database tools and tracks the activity event', () => {
    const { onChangeActivity } = useActivityMenu();
    const activityStore = useActivityBarStore();

    onChangeActivity(ActivityBarItemType.DatabaseTools);

    expect(activityStore.activityActive).toBe(
      ActivityBarItemType.DatabaseTools
    );
    expect(trackEventMock).toHaveBeenCalledWith('activity_bar', {
      activity: ActivityBarItemType.DatabaseTools,
    });
  });

  it('hides SQL-only activity items for a Redis connection', () => {
    routeMock.params.workspaceId = 'ws-redis';
    routeMock.params.connectionId = 'conn-redis';

    const connectionStore = useManagementConnectionStore();
    connectionStore.connections = [
      {
        id: 'conn-redis',
        workspaceId: 'ws-redis',
        name: 'Redis Fixture',
        type: DatabaseClientType.REDIS,
        method: EConnectionMethod.STRING,
        connectionString: 'redis://127.0.0.1:6379/0',
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    ];

    const { activity } = useActivityMenu();

    expect(activity.value.map(item => item.id)).toEqual([
      ActivityBarItemType.Explorer,
      ActivityBarItemType.Schemas,
      ActivityBarItemType.DatabaseTools,
    ]);
  });

  it('hides users and agent activity items for a SQLite connection', () => {
    routeMock.params.workspaceId = 'ws-sqlite';
    routeMock.params.connectionId = 'conn-sqlite';

    const connectionStore = useManagementConnectionStore();
    connectionStore.connections = [
      {
        id: 'conn-sqlite',
        workspaceId: 'ws-sqlite',
        name: 'SQLite Fixture',
        type: DatabaseClientType.SQLITE3,
        method: EConnectionMethod.FILE,
        connectionString: '/tmp/test.db',
        createdAt: '2026-04-29T00:00:00.000Z',
      },
    ];

    const { activity } = useActivityMenu();

    expect(activity.value.map(item => item.id)).toEqual([
      ActivityBarItemType.Explorer,
      ActivityBarItemType.Schemas,
      ActivityBarItemType.ErdDiagram,
      ActivityBarItemType.DatabaseTools,
    ]);
  });
});
