import { reactive, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaces } from '~/components/modules/workspace/hooks/useWorkspaces';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Bypass the 200ms debounce so searches filter immediately in tests
vi.mock('@vueuse/core', async importOriginal => {
  const mod = await importOriginal<typeof import('@vueuse/core')>();
  return {
    ...mod,
    refDebounced: <T>(source: T) => source,
  };
});

const mockWorkspaceStore = reactive({
  workspaces: [
    {
      id: 'ws-1',
      name: 'Alpha Workspace',
      icon: 'lucide:badge',
      createdAt: '2024-01-01',
    },
    {
      id: 'ws-2',
      name: 'Beta Database',
      icon: 'lucide:building-2',
      createdAt: '2024-01-02',
    },
    {
      id: 'ws-3',
      name: 'Gamma Project',
      icon: 'lucide:book',
      createdAt: '2024-01-03',
    },
  ] as any[],
});

const mockConnectionStore = {
  getConnectionsByWorkspaceId: vi.fn((wsId: string) => []),
};

vi.mock('~/core/contexts/useAppContext', () => ({
  useAppContext: () => ({
    workspaceStore: mockWorkspaceStore,
    connectionStore: mockConnectionStore,
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWorkspaces', () => {
  beforeEach(() => {
    mockWorkspaceStore.workspaces = [
      {
        id: 'ws-1',
        name: 'Alpha Workspace',
        icon: 'lucide:badge',
        createdAt: '2024-01-01',
      },
      {
        id: 'ws-2',
        name: 'Beta Database',
        icon: 'lucide:building-2',
        createdAt: '2024-01-02',
      },
      {
        id: 'ws-3',
        name: 'Gamma Project',
        icon: 'lucide:book',
        createdAt: '2024-01-03',
      },
    ];
  });

  // -- Initial state --------------------------------------------------------

  it('returns all workspaces when search is empty', () => {
    const { mappedWorkspaces } = useWorkspaces();
    expect(mappedWorkspaces.value).toHaveLength(3);
  });

  it('starts with search as empty string', () => {
    const { search } = useWorkspaces();
    expect(search.value).toBe('');
  });

  it('isOpenCreateWSModal starts as false', () => {
    const { isOpenCreateWSModal } = useWorkspaces();
    expect(isOpenCreateWSModal.value).toBe(false);
  });

  it('isOpenSelectConnectionModal starts as false', () => {
    const { isOpenSelectConnectionModal } = useWorkspaces();
    expect(isOpenSelectConnectionModal.value).toBe(false);
  });

  it('workspaceId starts as empty string', () => {
    const { workspaceId } = useWorkspaces();
    expect(workspaceId.value).toBe('');
  });

  // -- Search / filtering ---------------------------------------------------

  it('filters workspaces by search term', async () => {
    const { search, mappedWorkspaces } = useWorkspaces();

    search.value = 'alpha';
    await nextTick();

    expect(mappedWorkspaces.value).toHaveLength(1);
    expect(mappedWorkspaces.value[0]!.name).toBe('Alpha Workspace');
  });

  it('search is case-insensitive', async () => {
    const { search, mappedWorkspaces } = useWorkspaces();

    search.value = 'BETA';
    await nextTick();

    expect(mappedWorkspaces.value).toHaveLength(1);
    expect(mappedWorkspaces.value[0]!.id).toBe('ws-2');
  });

  it('returns empty array when no workspaces match search', async () => {
    const { search, mappedWorkspaces } = useWorkspaces();

    search.value = 'zzzz-no-match';
    await nextTick();

    expect(mappedWorkspaces.value).toHaveLength(0);
  });

  it('returns all workspaces when search is cleared', async () => {
    const { search, mappedWorkspaces } = useWorkspaces();

    search.value = 'alpha';
    await nextTick();
    expect(mappedWorkspaces.value).toHaveLength(1);

    search.value = '';
    await nextTick();
    expect(mappedWorkspaces.value).toHaveLength(3);
  });

  it('reflects changes to the workspace store reactively', async () => {
    const { mappedWorkspaces } = useWorkspaces();

    expect(mappedWorkspaces.value).toHaveLength(3);

    mockWorkspaceStore.workspaces = [];
    await nextTick();

    expect(mappedWorkspaces.value).toHaveLength(0);
  });

  // -- onSelectWorkspace ----------------------------------------------------

  it('onSelectWorkspace sets workspaceId and opens connection modal', () => {
    const { onSelectWorkspace, workspaceId, isOpenSelectConnectionModal } =
      useWorkspaces();

    onSelectWorkspace('ws-42');

    expect(workspaceId.value).toBe('ws-42');
    expect(isOpenSelectConnectionModal.value).toBe(true);
  });

  it('onSelectWorkspace can be called multiple times with different ids', () => {
    const { onSelectWorkspace, workspaceId } = useWorkspaces();

    onSelectWorkspace('ws-1');
    expect(workspaceId.value).toBe('ws-1');

    onSelectWorkspace('ws-2');
    expect(workspaceId.value).toBe('ws-2');
  });

  // -- Store references exposed correctly ------------------------------------

  it('exposes workspaceStore reference', () => {
    const { workspaceStore } = useWorkspaces();
    expect(workspaceStore).toBeDefined();
    expect(workspaceStore.workspaces).toBeDefined();
  });

  it('exposes connectionStore reference', () => {
    const { connectionStore } = useWorkspaces();
    expect(connectionStore).toBeDefined();
  });
});
