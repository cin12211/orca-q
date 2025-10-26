import { buildAppStateId, useAppStateStore } from './useWsStateStore';

export function useAppStatesService() {
  const store = useAppStateStore();
  const isLoading = ref(false);
  const error = ref<string>();

  async function loadAll() {
    isLoading.value = true;
    store.setStatus('loading');
    store.setError(undefined);
    try {
      const data = await window.workspaceStateApi.getAll(); // tuỳ bạn
      store.resetState();
      store.upsertStates(data);
      store.setStatus('ready');
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load app states';
      store.setError(error.value);
      store.setStatus('error');
    } finally {
      isLoading.value = false;
    }
  }

  async function create(
    payload: Parameters<typeof window.workspaceStateApi.create>[0]
  ) {
    store.upsertState(payload); // optimistic
    const created = await window.workspaceStateApi.create(payload);
    return created;
  }

  async function update(
    id: string,
    patch: Partial<Parameters<typeof window.workspaceStateApi.update>[0]>
  ) {
    const updated = store.updateState(id, patch);
    if (updated) await window.workspaceStateApi.update(updated);
    return updated;
  }

  async function remove(id: string) {
    store.removeState(id);
    await window.workspaceStateApi.delete(id);
  }

  async function setSelectedState({
    connId,
    wsId,
  }: {
    wsId: string;
    connId: string;
  }) {
    const currentSelect = store.getSelectedState();

    if (currentSelect) {
      currentSelect.isSelect = false;

      await window.workspaceStateApi.update(currentSelect);
    }

    store.selectOnly;

    const stateId = buildAppStateId(wsId, connId);
    const state = store.byId(stateId);

    if (state.value) {
      state.value.isSelect = true;
      await window.workspaceStateApi.update(state.value);
    }
  }

  return {
    isLoading,
    error,
    loadAll,
    create,
    update,
    remove,
    store,
    setSelectedState,
  };
}
