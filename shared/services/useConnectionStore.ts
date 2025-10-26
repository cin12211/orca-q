// stores/useManagementConnectionStore.ts
import { defineStore } from 'pinia';
import { reactive, computed, type ComputedRef } from 'vue';
import dayjs from 'dayjs';
import {
  EConnectionMethod,
  type EConnectionHealth,
  type EDatabaseType,
} from '~/components/modules/connection/type';
import type { StoreStatus } from './useWorkspacesStore';

export interface BaseConnection {
  //info
  workspaceId: string;
  id: string;
  name: string;

  // type
  type: EDatabaseType;
  method: EConnectionMethod;

  // meta
  createdAt: string;
  updatedAt?: string;
  version?: number;
  lastUsedAt?: string;
  health?: EConnectionHealth;
  note?: string;
  labels?: string[];
  readOnlyMode?: boolean;
}

export interface ConnectionString extends BaseConnection {
  method: EConnectionMethod.ConnectionString;
  connectionString: string;
}

export interface BaseDirectConnection {
  host: string;
  port: string; // string để dễ binding UI, parse khi cần
  username?: string;
  password?: string;
  database?: string; // với Redis có thể để trống (dùng DB index khác trường)
  // optional params phổ biến
  filePath?: string; // "/absolute/path/to/db.sqlite" hoặc ":memory:" use case sql lite
  ssl?: boolean;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export interface DirectConnection extends BaseConnection, BaseDirectConnection {
  method: EConnectionMethod.Direct;
}

export interface SSHTunnelConfig {
  sshHost: string;
  sshPort: string; // string for UI
  sshUser: string;
  sshAuth: 'password' | 'key';
  sshPassword?: string;
  sshPrivateKey?: string; // PEM content (đã được mã hoá/ lưu an toàn ở nơi khác)
  sshPassphrase?: string;
  // (optional) bật keepalive
  keepAliveIntervalSec?: number;
}

export interface SSHConnection extends BaseConnection, BaseDirectConnection {
  method: EConnectionMethod.SSH;
  ssh: SSHTunnelConfig;
}

/** Type guards (hữu ích khi phân nhánh theo method) */
export const isConnectionString = (c: Connection): c is ConnectionString =>
  c.method === EConnectionMethod.ConnectionString;

export const isDirectConnection = (c: Connection): c is DirectConnection =>
  c.method === EConnectionMethod.Direct;

export const isSSHConnection = (c: Connection): c is SSHConnection =>
  c.method === EConnectionMethod.SSH;

export type Connection = ConnectionString | DirectConnection | SSHConnection;

export interface ConnectionsState {
  byId: Record<string, Connection>;
  allIds: string[];
  status: StoreStatus;
  error?: string;
}

export const useConnectionStore = defineStore(
  'connection-store',
  () => {
    // ============= State =============
    const state = reactive<ConnectionsState>({
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

    function upsertConnections(items: Connection[]): void {
      for (const c of items) {
        if (!state.byId[c.id]) state.allIds.push(c.id);
        state.byId[c.id] = c;
      }
      // sort newest createdAt first
      state.allIds.sort(
        (a, b) =>
          dayjs(state.byId[b]?.createdAt).valueOf() -
          dayjs(state.byId[a]?.createdAt).valueOf()
      );
    }

    function upsertConnection(item: Connection): void {
      upsertConnections([item]);
    }

    function removeConnections(ids: string[]): void {
      for (const id of ids) delete state.byId[id];
      state.allIds = state.allIds.filter(id => !ids.includes(id));
    }

    function removeConnection(id: string): void {
      removeConnections([id]);
    }

    /** Cập nhật 1 connection bằng patch, giữ nguyên id & createdAt */
    function updateConnection(
      id: string,
      patch: Partial<Connection>
    ): Connection | null {
      const current = state.byId[id];
      if (!current) return null;

      // chặn đổi id/createdAt
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _createdAt, ...rest } = patch;

      state.byId[id] = {
        ...current,
        ...rest,
        updatedAt: rest.updatedAt ?? nowIso(),
      } as Connection;

      return state.byId[id];
    }

    /** Đánh dấu lastUsedAt khi user chọn/kết nối */
    function touchLastUsed(id: string, iso?: string): void {
      const current = state.byId[id];
      if (!current) return;
      state.byId[id] = {
        ...current,
        lastUsedAt: iso ?? nowIso(),
        updatedAt: nowIso(),
      };
    }

    // ============= Selectors (derived) =============
    const allConnections = computed(() =>
      state.allIds.map(id => state.byId[id])
    );
    const connectionCount = computed(() => state.allIds.length);

    function connectionById(id: string): ComputedRef<Connection | undefined> {
      return computed(() => state.byId[id]);
    }

    function connectionsByWorkspaceId(workspaceId: string): Connection[] {
      return allConnections.value.filter(c => c.workspaceId === workspaceId);
    }

    function searchConnectionsByName(query: string): Connection[] {
      const q = query.trim().toLowerCase();
      if (!q) return allConnections.value;
      return allConnections.value.filter(c => c.name.toLowerCase().includes(q));
    }

    return {
      // state
      state,

      // mutations
      resetState,
      setStatus,
      setError,
      upsertConnections,
      upsertConnection,
      removeConnections,
      removeConnection,
      updateConnection,
      touchLastUsed,

      // selectors
      allConnections,
      connectionCount,
      connectionById,
      connectionsByWorkspaceId,
      searchConnectionsByName,
    };
  },
  {
    persist: false, // để service chủ động load/flush
  }
);
