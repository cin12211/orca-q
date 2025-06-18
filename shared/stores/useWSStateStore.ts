import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface WorkspaceState {
  id: string;
  connectionId?: string;
  connectionStates?: {
    id: string;
    schemaId: string;
    tabViewId?: string;
    sideBarExplorer?: unknown;
    sideBarSchemas?: unknown;
  }[];
}

export const useWSStateStore = defineStore(
  'workspaces-state',
  () => {
    const wsStates = ref<WorkspaceState[]>([]);

    const workSpaceId = ref<string>();

    const wsState = computed(() =>
      wsStates.value.find(ws => ws.id === workSpaceId.value)
    );

    const onCreateNewWSState = async (wsState: WorkspaceState) => {
      await window.workspaceStateApi.create(wsState);
      await loadPersistData();
    };

    const loadPersistData = async () => {
      const load = await window.workspaceStateApi.getAll();
      console.log('🚀 ~ loadPersistData ~ load:', load);
      wsStates.value = load;
    };

    loadPersistData();

    const updateWSState = async (wsState: WorkspaceState) => {
      console.log('🚀 ~ updateWSState ~ wsState:', wsState);

      await window.workspaceStateApi.update(wsState);
      await loadPersistData();
    };

    const setActiveWSId = (workspaceId: string) => {
      workSpaceId.value = workspaceId;
    };

    const setConnectionId = ({
      connectionId,
      workspaceId,
    }: {
      workspaceId: string;
      connectionId: string;
    }) => {
      const wsState = wsStates.value.find(ws => ws.id === workspaceId);
      if (wsState) {
        updateWSState({
          ...wsState,
          connectionId,
        });
      }
    };

    const setSchemaId = ({
      connectionId,
      workspaceId,
      schemaId,
    }: {
      workspaceId: string;
      schemaId: string;
      connectionId: string;
    }) => {
      const wsState = wsStates.value?.find(ws => ws.id === workspaceId);

      if (wsState) {
        const connectionStatesTmp = wsState?.connectionStates || [];

        if (!connectionStatesTmp?.length) {
          connectionStatesTmp?.push({
            id: connectionId,
            schemaId,
          });
        }

        updateWSState({
          ...wsState,
          connectionStates: connectionStatesTmp.map(connectionState => {
            if (connectionState.id === connectionId) {
              return {
                ...connectionState,
                schemaId,
              };
            }
            return connectionState;
          }),
        });
      }
    };

    const connectionId = computed(() => {
      return wsState.value?.connectionId;
    });

    const schemaId = computed(() => {
      return wsState.value?.connectionStates?.find(
        connectionState => connectionState.id === connectionId.value
      )?.schemaId;
    });

    return {
      workSpaceId,
      wsState,
      updateWSState,
      setActiveWSId,
      setConnectionId,
      setSchemaId,
      schemaId,
      connectionId,
      onCreateNewWSState,
    };
  },
  {
    persist: false,
  }
);
