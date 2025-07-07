import dayjs from 'dayjs';
import localforage from 'localforage';
import type { Workspace } from '../stores';
import { connectionIDBApi } from './connectionIDBApi';
import { quickQueryLogsIDBApi } from './quickQueryLogsIDBApi';

const workspaceIDBStore = localforage.createInstance({
  name: 'workspaceIDB',
  storeName: 'workspaces',
});

// Helper to get all workspaces and sort by createdAt
const getAllWorkspaces = async (): Promise<Workspace[]> => {
  const workspaces: Workspace[] = [];
  await workspaceIDBStore.iterate((value: Workspace, key: string) => {
    workspaces.push(value);
  });
  return workspaces.sort((a, b) => a.createdAt!.localeCompare(b.createdAt!));
};

// Get all workspaces
const handleGets = async (): Promise<Workspace[]> => {
  return await getAllWorkspaces();
};

// Get one workspace by ID
const handleGetOne = async (id: string): Promise<Workspace | null> => {
  const workspace = await workspaceIDBStore.getItem<Workspace>(id);
  return workspace;
};

// Create a new workspace
const handleCreate = async (workspace: Workspace): Promise<Workspace> => {
  const workspaceTmp: Workspace = {
    ...workspace,
    id: workspace.id || crypto.randomUUID(), // Ensure ID exists
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  };
  await workspaceIDBStore.setItem(workspaceTmp.id, workspaceTmp);
  return workspaceTmp;
};

// Update an existing workspace
const handleUpdate = async (
  workspace: Workspace
): Promise<Workspace | null> => {
  const currentWorkspace = await workspaceIDBStore.getItem<Workspace>(
    workspace.id
  );
  if (!currentWorkspace) return null;

  const workspaceTmp: Workspace = {
    ...workspace,
    updatedAt: dayjs().toISOString(),
  };
  await workspaceIDBStore.setItem(workspaceTmp.id, workspaceTmp);
  return workspaceTmp;
};

// Delete a workspace by ID
const handleDelete = async (id: string): Promise<Workspace | null> => {
  const workspace = await workspaceIDBStore.getItem<Workspace>(id);
  if (!workspace) return null;

  await workspaceIDBStore.removeItem(id);
  await connectionIDBApi.deleteAllByWorkspaceId(id);
  await workspaceIDBApi.delete(id);
  await quickQueryLogsIDBApi.delete({ workspaceId: id });

  return workspace;
};

export const workspaceIDBApi: Window['workspaceApi'] = {
  getAll: async () => await handleGets(),
  getOne: async (id: string) => await handleGetOne(id),
  create: async (workspace: Workspace) => await handleCreate(workspace),
  update: async (workspace: Workspace) => await handleUpdate(workspace),
  delete: async (id: string) => await handleDelete(id),
};
