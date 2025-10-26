import dayjs from 'dayjs';
import { useWorkspacesStore } from './useWorkspacesStore';
import { useAppStatesService } from './useWsStateService';

export function useWorkspacesService() {
  const wsStore = useWorkspacesStore();

  const {
    create: createAppState,
    setSelectedState,
    store: appStateStore,
  } = useAppStatesService();

  const isLoading = ref(false);
  const error = ref<string>();

  async function loadAll() {
    isLoading.value = true;
    wsStore.setStatus('loading');
    wsStore.setError(undefined);
    try {
      const data = await window.workspaceApi.getAll();
      console.log('🚀 ~ loadAll ~ data:', data);
      wsStore.resetState();
      wsStore.upsertWorkspaces(data);
      wsStore.setStatus('ready');
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load workspaces';
      wsStore.setError(error.value);
      wsStore.setStatus('error');
    } finally {
      isLoading.value = false;
    }
  }

  async function create(
    payload: Parameters<typeof window.workspaceApi.create>[0]
  ) {
    wsStore.upsertWorkspace(payload);
    const created = await window.workspaceApi.create(payload);

    return created;
  }

  async function update(
    id: string,
    payload: Parameters<typeof window.workspaceApi.update>[0]
  ) {
    const updated = wsStore.updateWorkspace(id, payload);

    if (updated) await window.workspaceApi.update(toRaw(updated));

    return updated;
  }

  /**
   * Xoá workspace + cascade qua các repo khác.
   * Nếu bạn đã dời cascade xuống IDB layer, chỉ cần Repos.workspaces.delete(id).
   */
  async function remove(workspaceId: string) {
    wsStore.removeWorkspace(workspaceId);
    await window.workspaceApi.delete(workspaceId);

    // 0) Lấy dữ liệu đang có trong stores để quyết định xoá (tránh scan full IDB khi có sẵn state)
    // const conns = connStore.connections.filter(
    //   c => c.workspaceId === workspaceId
    // );
    // // 1) Cascade trước (repo IO)
    // for (const c of conns) {
    //   await window.connectionApi.delete(c.id); // bên dưới có thể tự xoá logs theo connection
    // }
    // await Repos.rowQueryFiles.removeByWorkspace(workspaceId);
    // if ('deleteByWorkspace' in Repos.tabViews) {
    //   await (Repos.tabViews as any).deleteByWorkspace(workspaceId);
    // }
    // await Repos.quickQueryLogs.delete({ workspaceId });
    // // 2) Xoá workspace
    // const deleted = await Repos.workspaces.delete(workspaceId);
    // // 3) Cập nhật stores đồng bộ (sync)
    // if (deleted) {
    //   // xoá connections thuộc workspace
    //   connStore.connections = connStore.connections.filter(
    //     c => c.workspaceId !== workspaceId
    //   );
    //   // xoá file phẳng (tuỳ bạn có giữ flatNodes theo ws không)
    //   filesStore.flatNodes = filesStore.flatNodes.filter(
    //     f => f.workspaceId !== workspaceId
    //   );
    //   // xoá tabs theo ws
    //   tabsStore.tabViews = tabsStore.tabViews.filter(
    //     t => t.workspaceId !== workspaceId
    //   );
    //   // xoá logs theo ws
    //   qqStore.qqLogs = qqStore.qqLogs.filter(
    //     l => l.workspaceId !== workspaceId
    //   );
    //   wsStore.removeOne(workspaceId);
    // }
    // return deleted;
  }

  //   // (optional) BroadcastChannel cho đa tab
  //   let channel: BroadcastChannel | undefined;
  //   function startChannel() {
  //     if (typeof BroadcastChannel === 'undefined') return;
  //     channel = new BroadcastChannel('workspaces');
  //     channel.onmessage = ev => {
  //       if (ev?.data?.type === 'workspaces/updated') loadAll();
  //     };
  //   }
  //   function stopChannel() {
  //     channel?.close();
  //     channel = undefined;
  //   }

  //   onMounted(startChannel);
  //   onBeforeUnmount(stopChannel);

  const changeLastOpened = async (workspaceId: string) => {
    const workSpaceUpdated = await wsStore.updateWorkspace(workspaceId, {
      lastOpened: dayjs().toISOString(),
    });

    if (workSpaceUpdated) await window.workspaceApi.update(workSpaceUpdated);
  };

  const openWorkspace = async ({
    wsId,
    connId,
  }: {
    wsId: string;
    connId: string;
  }) => {
    await changeLastOpened(wsId);

    const stateId = `${wsId}:${connId}`;

    const state = appStateStore.allStates.find(ws => ws.id === stateId);

    if (!state) {
      await createAppState({
        id: stateId,
        workspaceId: wsId,
        connectionId: connId,
        isSelect: false,
      });
    }

    await setSelectedState({
      connId,
      wsId,
    });

    await navigateTo({
      name: 'workspaceId-connectionId',
      params: {
        workspaceId: wsId,
        connectionId: connId,
      },
    });
  };

  return {
    isLoading,
    error,
    loadAll,
    create,
    update,
    remove,
    wsStore,
    openWorkspace,
  };
}
