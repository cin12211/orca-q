// services/useConnectionsService.ts
import { ref, toRaw } from 'vue';
import { useConnectionStore } from './useConnectionStore';
import { useAppStatesService } from './useWsStateService';

export function useConnectionsService() {
  const connStore = useConnectionStore();

  const { create: createAppState } = useAppStatesService();

  const isLoading = ref(false);
  const error = ref<string>();

  async function loadAll() {
    isLoading.value = true;
    connStore.setStatus('loading');
    connStore.setError(undefined);
    try {
      const data = await window.connectionApi.getAll();
      connStore.resetState();
      connStore.upsertConnections(data);
      connStore.setStatus('ready');
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load connections';
      connStore.setError(error.value);
      connStore.setStatus('error');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Tạo mới (optimistic): push lên store trước, nếu IO fail thì rollback & throw.
   */
  async function create(
    payload: Parameters<typeof window.connectionApi.create>[0]
  ) {
    // optimistic
    connStore.upsertConnection(payload);
    try {
      const created = await window.connectionApi.create(payload);
      // (optional) sync lại đúng dữ liệu từ IO (nếu IO có bổ sung field)
      if (created?.id) connStore.upsertConnection(created);

      await createAppState({
        connectionId: payload.id,
        workspaceId: payload.workspaceId,
        id: '',
        isSelect: false,
      });

      return created;
    } catch (e) {
      // rollback
      connStore.removeConnection(payload.id);
      throw e;
    }
  }

  /**
   * Update (optimistic with backup & rollback)
   */
  async function update(
    id: string,
    patch: Parameters<typeof window.connectionApi.update>[0]
  ) {
    const before = toRaw(connStore.state.byId[id]);
    const after = connStore.updateConnection(id, patch);

    try {
      if (after) {
        await window.connectionApi.update(toRaw(after));
      }
      return after;
    } catch (e) {
      // rollback
      if (before) connStore.upsertConnection(before);
      throw e;
    }
  }

  /**
   * Xoá (optimistic with rollback)
   */
  async function remove(connectionId: string) {
    const backup = toRaw(connStore.state.byId[connectionId]);
    // optimistic
    connStore.removeConnection(connectionId);

    try {
      await window.connectionApi.delete(connectionId);
    } catch (e) {
      // rollback
      if (backup) connStore.upsertConnection(backup);
      throw e;
    }
  }

  /**
   * Mark last used (sync trước, IO sau). Không bắt buộc IO nếu bạn không lưu field này ở IDB.
   */
  async function touchLastUsed(id: string) {
    const backup = toRaw(connStore.state.byId[id]);
    connStore.touchLastUsed(id);
    try {
      const current = connStore.state.byId[id];
      if (current) await window.connectionApi.update(toRaw(current));
    } catch (e) {
      if (backup) connStore.upsertConnection(backup);
      throw e;
    }
  }

  return {
    isLoading,
    error,
    loadAll,
    create,
    update,
    remove,
    touchLastUsed,
    connStore,
  };
}
