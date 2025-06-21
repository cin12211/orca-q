import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';

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
  openedAt?: string;
  updatedAt?: string;
}

export const useWSStateStore = defineStore(
  'workspaces-state',
  () => {
    const wsStates = ref<WorkspaceState[]>([]);

    const workspaceId = ref<string>();

    const connId = ref<string>();

    const wsState = computed(() =>
      wsStates.value.find(
        ws => ws.id === workspaceId.value && ws.connectionId === connId.value
      )
    );

    const onCreateNewWSState = async (wsState: WorkspaceState) => {
      const wsStateTmp: WorkspaceState = {
        ...wsState,
        openedAt: dayjs().toISOString(),
        updatedAt: dayjs().toISOString(),
      };

      await window.workspaceStateApi.create(wsStateTmp);
      await loadPersistData();

      return wsStateTmp;
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

    const setActiveWSId = ({
      wsId,
      connId: _connId,
    }: {
      wsId?: string;
      connId?: string;
    }) => {
      console.log('🚀 ~ setActiveWSId ~ wsId:', wsId, _connId);

      workspaceId.value = wsId;
      connId.value = _connId;
    };

    const setConnectionId = async ({
      connectionId,
      workspaceId,
    }: {
      workspaceId: string;
      connectionId: string;
    }) => {
      let wsStateUpdated = wsStates.value.find(
        ws => ws.id === workspaceId && ws.connectionId === connectionId
      );

      console.log('wsStateUpdated', wsStateUpdated);

      if (!wsStateUpdated) {
        wsStateUpdated = await onCreateNewWSState({
          id: workspaceId,
          connectionId,
        });
      }

      connId.value = connectionId;
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
      const wsState = wsStates.value.find(
        ws => ws.id === workspaceId && ws.connectionId === connectionId
      );

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
          updatedAt: dayjs().toISOString(),
          openedAt: dayjs().toISOString(),
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
      const wsState = wsStates.value.find(
        ws => ws.id === workspaceId && ws.connectionId === connectionId
      );

      if (wsState) {
        const connectionStatesTmp = wsState?.connectionStates || [];

        await updateWSState({
          ...wsState,
          updatedAt: dayjs().toISOString(),
          openedAt: dayjs().toISOString(),
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
      getStateById,
      setTabViewId,
      tabViewId,
    };
  },
  {
    persist: false,
  }
);
