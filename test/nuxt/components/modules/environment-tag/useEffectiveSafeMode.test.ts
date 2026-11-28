import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useEffectiveSafeMode,
  useIsStrictConnection,
} from '~/components/modules/environment-tag/hooks';
import type { Connection } from '~/core/stores';

const { mockAppConfigStore, mockTags } = vi.hoisted(() => ({
  mockAppConfigStore: { quickQuerySafeModeEnabled: false },
  mockTags: {
    prod: { id: 'prod', name: 'Prod', strictMode: true },
    dev: { id: 'dev', name: 'Dev', strictMode: false },
  } as Record<string, { id: string; name: string; strictMode: boolean }>,
}));

vi.mock('~/core/stores/appConfigStore', () => ({
  useAppConfigStore: () => mockAppConfigStore,
}));

vi.mock('~/core/stores', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useEnvironmentTagStore: () => ({
      getTagsByIds: (ids: string[]) =>
        ids.flatMap(id => (mockTags[id] ? [mockTags[id]] : [])),
    }),
  };
});

const makeConnection = (tagIds?: string[]) =>
  ({ id: 'conn-1', name: 'Conn', tagIds }) as unknown as Connection;

describe('useEffectiveSafeMode', () => {
  beforeEach(() => {
    mockAppConfigStore.quickQuerySafeModeEnabled = false;
  });

  it('follows the global setting when the connection has no strict tag', () => {
    const connection = ref<Connection | undefined>(makeConnection(['dev']));
    const safeMode = useEffectiveSafeMode(connection);

    expect(safeMode.value).toBe(false);

    mockAppConfigStore.quickQuerySafeModeEnabled = true;
    expect(useEffectiveSafeMode(connection).value).toBe(true);
  });

  it('is forced on by a Strict Mode tag even when the setting is off', () => {
    const connection = ref<Connection | undefined>(
      makeConnection(['dev', 'prod'])
    );

    expect(useIsStrictConnection(connection).value).toBe(true);
    expect(useEffectiveSafeMode(connection).value).toBe(true);
  });

  it('reacts when the connection changes', () => {
    const connection = ref<Connection | undefined>(makeConnection(['prod']));
    const safeMode = useEffectiveSafeMode(connection);
    expect(safeMode.value).toBe(true);

    connection.value = makeConnection([]);
    expect(safeMode.value).toBe(false);

    connection.value = undefined;
    expect(safeMode.value).toBe(false);
  });
});
