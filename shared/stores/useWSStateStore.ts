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

    const workspaceId = ref<string>();

    const wsState = computed(() =>
      wsStates.value.find(ws => ws.id === workspaceId.value)
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
      const mappedState = {
        ...wsState,
        connectionStates: wsState?.connectionStates?.map(connectionState => {
          return {
            ...connectionState,
            sideBarExplorer: null,
            sideBarSchemas: null,
          };
        }),
      };
      await window.workspaceStateApi.update(mappedState);
      await loadPersistData();
    };

    const setActiveWSId = (wsId?: string) => {
      console.log('🚀 ~ setActiveWSId ~ wsId:', wsId);

      workspaceId.value = wsId;
    };

    const setConnectionId = async ({
      connectionId,
      workspaceId,
    }: {
      workspaceId: string;
      connectionId: string;
    }) => {
      const wsStateUpdated = wsStates.value.find(ws => ws.id === workspaceId);

      if (!wsStateUpdated) {
        throw new Error('No workspace state found');
      }

      if (wsStateUpdated) {
        await updateWSState({
          ...wsStateUpdated,
          connectionId,
        });
      }
    };

    const setSchemaId = async ({
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

        const isEmpty = !connectionStatesTmp?.length;
        const isNotExist = !connectionStatesTmp.find(
          connectionState => connectionState.id === connectionId
        );

        if (isEmpty || isNotExist) {
          connectionStatesTmp?.push({
            id: connectionId,
            schemaId,
          });
        }

        await updateWSState({
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

    const setTabViewId = async ({
      connectionId,
      workspaceId,
      tabViewId,
    }: {
      workspaceId: string;
      tabViewId?: string;
      connectionId: string;
    }) => {
      const wsState = wsStates.value?.find(ws => ws.id === workspaceId);

      if (wsState) {
        const connectionStatesTmp = wsState?.connectionStates || [];

        await updateWSState({
          ...wsState,
          connectionStates: connectionStatesTmp.map(connectionState => {
            if (connectionState.id === connectionId) {
              return {
                ...connectionState,
                tabViewId,
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

    const tabViewId = computed(() => {
      return wsState.value?.connectionStates?.find(
        connectionState => connectionState.id === connectionId.value
      )?.tabViewId;
    });

    const getStateById = ({
      workspaceId,
      connectionId,
    }: {
      workspaceId: string;
      connectionId: string;
    }) => {
      return wsStates.value.find(
        ws => ws.id === workspaceId && ws.connectionId === connectionId
      );
    };

    return {
      workspaceId,
      wsState,
      updateWSState,
      setActiveWSId,
      setConnectionId,
      setSchemaId,
      schemaId,
      connectionId,
      onCreateNewWSState,
      getStateById,
      setTabViewId,
      tabViewId,
    };
  },
  {
    persist: false,
  }
);
