import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/components/modules/connection/types';
import { useWorkspaceCard } from '~/components/modules/workspace/hooks/useWorkspaceCard';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection, Workspace } from '~/core/stores';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDeleteWorkspace = vi.fn();
const mockOpenWorkspaceWithConnection = vi.fn();
const mockCreateConnection = vi.fn();

const mockConnections = reactive<Connection[]>([]);

const mockConnectionStore = {
  get connections() {
    return mockConnections;
  },
  getConnectionsByWorkspaceId: (wsId: string) =>
    mockConnections.filter(c => c.workspaceId === wsId),
};

vi.mock('~/core/contexts/useAppContext', () => ({
  useAppContext: () => ({
    workspaceStore: {
      deleteWorkspace: mockDeleteWorkspace,
    },
    connectionStore: mockConnectionStore,
    createConnection: mockCreateConnection,
    openWorkspaceWithConnection: mockOpenWorkspaceWithConnection,
  }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeWorkspace = (id = 'ws-test'): Workspace => ({
  id,
  name: 'Test Workspace',
  icon: 'lucide:badge',
  createdAt: '2024-01-01',
});

const makeConnection = (id: string, wsId: string): Connection => ({
  id,
  workspaceId: wsId,
  name: `conn-${id}`,
  type: DatabaseClientType.POSTGRES,
  method: EConnectionMethod.STRING,
  connectionString: 'postgresql://u:p@localhost:5432/db',
  createdAt: '2024-01-01',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWorkspaceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnections.length = 0;
  });

  // -- Modal state defaults ------------------------------------------------

  it('starts with all modals closed', () => {
    const ws = makeWorkspace();
    const {
      isOpenEditModal,
      isOpenDeleteModal,
      isOpenConnectionSelector,
      isModalCreateConnectionOpen,
    } = useWorkspaceCard({ workspace: ws });

    expect(isOpenEditModal.value).toBe(false);
    expect(isOpenDeleteModal.value).toBe(false);
    expect(isOpenConnectionSelector.value).toBe(false);
    expect(isModalCreateConnectionOpen.value).toBe(false);
  });

  // -- Delete confirmation flow -------------------------------------------

  it('onConfirmDelete calls workspaceStore.deleteWorkspace with workspace id', () => {
    const ws = makeWorkspace('ws-abc');
    const { onConfirmDelete, isOpenDeleteModal } = useWorkspaceCard({
      workspace: ws,
    });

    isOpenDeleteModal.value = true;
    onConfirmDelete();

    expect(mockDeleteWorkspace).toHaveBeenCalledOnce();
    expect(mockDeleteWorkspace).toHaveBeenCalledWith('ws-abc');
  });

  it('onConfirmDelete closes the delete modal', () => {
    const ws = makeWorkspace();
    const { onConfirmDelete, isOpenDeleteModal } = useWorkspaceCard({
      workspace: ws,
    });

    isOpenDeleteModal.value = true;
    onConfirmDelete();

    expect(isOpenDeleteModal.value).toBe(false);
  });

  // -- Connections computed -----------------------------------------------

  it('connections computed returns empty array when workspace has no connections', () => {
    const ws = makeWorkspace('ws-empty');
    const { connections } = useWorkspaceCard({ workspace: ws });

    expect(connections.value).toHaveLength(0);
  });

  it('connections computed returns only connections belonging to this workspace', () => {
    const ws = makeWorkspace('ws-1');
    mockConnections.push(
      makeConnection('conn-1', 'ws-1'),
      makeConnection('conn-2', 'ws-1'),
      makeConnection('conn-3', 'ws-other') // different workspace
    );

    const { connections } = useWorkspaceCard({ workspace: ws });

    expect(connections.value).toHaveLength(2);
    expect(connections.value.every(c => c.workspaceId === 'ws-1')).toBe(true);
  });

  // -- Open workspace with connection ------------------------------------

  it('onOpenWorkspaceWithConnection calls openWorkspaceWithConnection with correct ids', async () => {
    const ws = makeWorkspace('ws-1');
    const { onOpenWorkspaceWithConnection } = useWorkspaceCard({
      workspace: ws,
    });

    await onOpenWorkspaceWithConnection('conn-42');

    expect(mockOpenWorkspaceWithConnection).toHaveBeenCalledOnce();
    expect(mockOpenWorkspaceWithConnection).toHaveBeenCalledWith({
      connId: 'conn-42',
      wsId: 'ws-1',
    });
  });

  it('onOpenWorkspaceWithConnection closes connection selector', async () => {
    const ws = makeWorkspace();
    const {
      onOpenWorkspaceWithConnection,
      onOpenConnectionSelector,
      isOpenConnectionSelector,
    } = useWorkspaceCard({ workspace: ws });

    onOpenConnectionSelector();
    expect(isOpenConnectionSelector.value).toBe(true);

    await onOpenWorkspaceWithConnection('conn-1');
    expect(isOpenConnectionSelector.value).toBe(false);
  });

  // -- onOpenWorkspace ---------------------------------------------------

  it('onOpenWorkspace calls onSelectWorkspace callback with workspace id', () => {
    const onSelectWorkspace = vi.fn();
    const ws = makeWorkspace('ws-callback');
    const { onOpenWorkspace } = useWorkspaceCard({
      workspace: ws,
      onSelectWorkspace,
    });

    onOpenWorkspace();

    expect(onSelectWorkspace).toHaveBeenCalledWith('ws-callback');
  });

  it('onOpenWorkspace does not throw when onSelectWorkspace is not provided', () => {
    const ws = makeWorkspace();
    const { onOpenWorkspace } = useWorkspaceCard({ workspace: ws });

    expect(() => onOpenWorkspace()).not.toThrow();
  });

  // -- handleAddConnection -----------------------------------------------

  it('handleAddConnection calls createConnection with the provided connection', () => {
    const ws = makeWorkspace('ws-add');
    const { handleAddConnection } = useWorkspaceCard({ workspace: ws });

    const newConnection = makeConnection('conn-new', 'ws-add');
    handleAddConnection(newConnection);

    expect(mockCreateConnection).toHaveBeenCalledWith(newConnection);
  });

  // -- onOpenConnectionSelector ------------------------------------------

  it('onOpenConnectionSelector sets isOpenConnectionSelector to true', () => {
    const ws = makeWorkspace();
    const { onOpenConnectionSelector, isOpenConnectionSelector } =
      useWorkspaceCard({
        workspace: ws,
      });

    onOpenConnectionSelector();
    expect(isOpenConnectionSelector.value).toBe(true);
  });
});
