// stores/useWorkspacesStore.ts
import { defineStore } from 'pinia';
import { reactive, computed, type ComputedRef } from 'vue';
import dayjs from 'dayjs';

export interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lables?: string[];
  color?: string;

  lastOpened?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WorkspacesState {
  byId: Record<string, Workspace>;
  allIds: string[];
  status: StoreStatus;
  error?: string;
}

export const useWorkspacesStore = defineStore('workspace-store', () => {
  // ============= State =============
  const state = reactive<WorkspacesState>({
    byId: {},
    allIds: [],
    status: 'idle',
    error: undefined,
  });

  // ============= Helpers =============
  const nowIso = () => dayjs().toISOString();

  // ============= Mutations (sync) =============
  function resetState(): void {
    state.byId = {};
    state.allIds = [];
    state.status = 'idle';
    state.error = undefined;
  }

  function setStatus(status: StoreStatus): void {
    state.status = status;
  }

  function setError(message?: string): void {
    state.error = message;
  }

  function upsertWorkspaces(items: Workspace[]): void {
    for (const ws of items) {
      if (!state.byId[ws.id]) state.allIds.push(ws.id);
      state.byId[ws.id] = ws;
    }
    // sort newest createdAt first
    state.allIds.sort(
      (a, b) =>
        dayjs(state.byId[b]?.createdAt).valueOf() -
        dayjs(state.byId[a]?.createdAt).valueOf()
    );
  }

  function upsertWorkspace(item: Workspace): void {
    upsertWorkspaces([item]);
  }

  function removeWorkspaces(ids: string[]): void {
    for (const id of ids) delete state.byId[id];
    state.allIds = state.allIds.filter(id => !ids.includes(id));
  }

  function removeWorkspace(id: string): void {
    removeWorkspaces([id]);
  }

  /** 👇 NEW: update 1 workspace bằng patch (giữ nguyên id, createdAt) */
  function updateWorkspace(
    id: string,
    patch: Partial<Workspace>
  ): Workspace | null {
    const current = state.byId[id];
    if (!current) return null; // hoặc throw nếu bạn muốn strict

    // không cho đổi id / createdAt tại đây
    const { id: _, createdAt: __, ...rest } = patch;

    state.byId[id] = {
      ...current,
      ...rest,
    };

    return state.byId[id];
  }

  // ============= Selectors (derived) =============
  const allWorkspaces = computed(() => state.allIds.map(id => state.byId[id]));
  const workspaceCount = computed(() => state.allIds.length);

  function workspaceById(id: string): ComputedRef<Workspace | undefined> {
    return computed(() => state.byId[id]);
  }

  function searchWorkspacesByName(query: string): Workspace[] {
    const q = query.trim().toLowerCase();
    if (!q) return allWorkspaces.value;
    return allWorkspaces.value.filter(ws => ws.name.toLowerCase().includes(q));
  }

  return {
    // state
    state,

    // mutations
    resetState,
    setStatus,
    setError,
    upsertWorkspaces,
    upsertWorkspace,
    removeWorkspaces,
    removeWorkspace,
    updateWorkspace,

    // selectors
    allWorkspaces,
    workspaceCount,
    workspaceById,
    searchWorkspacesByName,
  };
});
