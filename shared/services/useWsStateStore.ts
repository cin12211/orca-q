// stores/useAppStateStore.ts
import { defineStore } from 'pinia';
import { reactive, computed, toRaw, type ComputedRef } from 'vue';
import dayjs from 'dayjs';
import type { StoreStatus } from './useWorkspacesStore';

export interface AppState {
  id: string; // gợi ý: có thể là `${workspaceId}:${connectionId}` hoặc UUID
  workspaceId: string;
  connectionId: string;

  schemaId?: string;
  tabViewId?: string;
  isSelect: boolean;

  openedAt?: string; // ISO
  updatedAt?: string; // ISO
}

export interface AppStatesState {
  byId: Record<string, AppState>;
  allIds: string[];
  status: StoreStatus;
  error?: string;
}

export const buildAppStateId = (workspaceId: string, connectionId: string) =>
  `${workspaceId}:${connectionId}`;
export const useAppStateStore = defineStore('app-states', () => {
  // ============= State =============
  const state = reactive<AppStatesState>({
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

  function upsertStates(items: AppState[]): void {
    for (const it of items) {
      const id = buildAppStateId(it.workspaceId, it.connectionId);

      if (!state.byId[id]) state.allIds.push(id);
      state.byId[id] = it;
    }

    // sort: mới mở gần đây trước, fallback updatedAt, rồi id
    state.allIds.sort((a, b) => {
      const A = state.byId[a];
      const B = state.byId[b];
      const tA = dayjs(A?.openedAt ?? A?.updatedAt ?? 0).valueOf();
      const tB = dayjs(B?.openedAt ?? B?.updatedAt ?? 0).valueOf();
      if (tA !== tB) return tB - tA;
      return a.localeCompare(b);
    });
  }

  function upsertState(item: AppState): void {
    upsertStates([item]);
  }

  function removeStates(ids: string[]): void {
    for (const id of ids) delete state.byId[id];
    state.allIds = state.allIds.filter(id => !ids.includes(id));
  }

  function removeState(id: string): void {
    removeStates([id]);
  }

  /** Patch an toàn: không cho đổi id/workspaceId/connectionId */
  function updateState(id: string, patch: Partial<AppState>): AppState | null {
    const current = state.byId[id];
    if (!current) return null;

    // chặn các key “định danh”
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, workspaceId: _ws, connectionId: _conn, ...rest } = patch;

    state.byId[id] = {
      ...current,
      ...rest,
      updatedAt: nowIso(),
    };
    return state.byId[id];
  }

  /** Đặt isSelect = true cho 1 bản ghi, và bỏ chọn những bản ghi khác cùng workspace/connection (single-select per context) */
  function selectOnly(id: string): void {
    const cur = state.byId[id];
    if (!cur) return;
    const { workspaceId, connectionId } = cur;

    for (const _id of state.allIds) {
      const it = state.byId[_id];
      if (!it) continue;
      if (it.workspaceId === workspaceId && it.connectionId === connectionId) {
        if (it.isSelect) {
          state.byId[_id] = { ...it, isSelect: false, updatedAt: nowIso() };
        }
      }
    }
    state.byId[id] = { ...cur, isSelect: true, updatedAt: nowIso() };
  }

  // ============= Selectors (derived) =============
  const allStates = computed(() => state.allIds.map(id => state.byId[id]));
  const count = computed(() => state.allIds.length);

  function byId(id: string): ComputedRef<AppState | undefined> {
    return computed(() => state.byId[id]);
  }

  /** Lấy bản ghi đang select trong 1 (workspace, connection) nếu có */
  function getSelectedState(): AppState | undefined {
    return allStates.value.find(it => it.isSelect);
  }

  return {
    // state
    state,

    // mutations
    resetState,
    setStatus,
    setError,
    upsertStates,
    upsertState,
    removeStates,
    removeState,
    updateState,
    selectOnly,

    // selectors
    allStates,
    count,
    byId,
    getSelectedState,
  };
});
