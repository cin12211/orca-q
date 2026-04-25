import type { DeleteTabViewProps } from '~/core/persist/types';
import type {
  Workspace,
  Connection,
  WorkspaceState,
  TabView,
  QuickQueryLog,
  RowQueryFile,
  RowQueryFileContent,
  EnvironmentTag,
  AppConfigPersistedState,
  AgentPersistedState,
  MigrationState,
} from '~/core/types/entities';

// ── 4.1 WorkspaceStorageApi ───────────────────────────────────────────────────

export interface WorkspaceStorageApi {
  getAll(): Promise<Workspace[]>;
  getOne(id: string): Promise<Workspace | null>;
  create(ws: Workspace): Promise<Workspace>;
  update(ws: Workspace): Promise<Workspace | null>;
  /** Cascade: deletes connections, states, logs, files for the workspace */
  delete(id: string): Promise<Workspace | null>;
}

// ── 4.2 ConnectionStorageApi ──────────────────────────────────────────────────

export interface ConnectionStorageApi {
  getAll(): Promise<Connection[]>;
  getOne(id: string): Promise<Connection | null>;
  getByWorkspaceId(wsId: string): Promise<Connection[]>;
  create(conn: Connection): Promise<Connection>;
  update(conn: Connection): Promise<Connection | null>;
  delete(id: string): Promise<Connection | null | void>;
}

// ── 4.3 WorkspaceStateStorageApi ─────────────────────────────────────────────

export interface WorkspaceStateStorageApi {
  getAll(): Promise<WorkspaceState[]>;
  create(ws: WorkspaceState): Promise<WorkspaceState>;
  update(ws: WorkspaceState): Promise<WorkspaceState | null>;
  delete(id: string): Promise<WorkspaceState | null | void>;
}

// ── 4.4 TabViewStorageApi ─────────────────────────────────────────────────────

export interface TabViewStorageApi {
  getAll(): Promise<TabView[]>;
  getByContext(ctx: {
    workspaceId: string;
    connectionId: string;
  }): Promise<TabView[]>;
  create(tab: TabView): Promise<TabView>;
  delete(id: string): Promise<TabView | null>;
  deleteByProps(props: DeleteTabViewProps): Promise<void>;
  bulkDeleteByProps(propsArray: DeleteTabViewProps[]): Promise<void>;
  replaceAll(tabs: TabView[]): Promise<void>;
}

// ── 4.5 QuickQueryLogStorageApi ───────────────────────────────────────────────

export interface QuickQueryLogStorageApi {
  getAll(): Promise<QuickQueryLog[]>;
  getByContext(ctx: { connectionId: string }): Promise<QuickQueryLog[]>;
  create(log: QuickQueryLog): Promise<QuickQueryLog>;
  delete(
    props:
      | { workspaceId: string }
      | { connectionId: string }
      | { connectionId: string; schemaName: string; tableName: string }
  ): Promise<void>;
}

// ── 4.6 RowQueryFileStorageApi ────────────────────────────────────────────────

export interface RowQueryFileStorageApi {
  getAllFiles(): Promise<RowQueryFile[]>;
  getFilesByContext(ctx: { workspaceId: string }): Promise<RowQueryFile[]>;
  createFiles(file: RowQueryFile): Promise<RowQueryFile>;
  updateFile(
    file: Partial<RowQueryFile> & { id: string }
  ): Promise<RowQueryFile | null>;
  updateFileContent(content: RowQueryFileContent): Promise<void>;
  getFileContentById(id: string): Promise<RowQueryFileContent | null>;
  deleteFile(props: { id: string }): Promise<void>;
  deleteFileByWorkspaceId(props: { wsId: string }): Promise<void>;
}

// ── 4.7 EnvironmentTagStorageApi ──────────────────────────────────────────────

export interface EnvironmentTagStorageApi {
  getAll(): Promise<EnvironmentTag[]>;
  getOne(id: string): Promise<EnvironmentTag | null>;
  create(tag: EnvironmentTag): Promise<EnvironmentTag>;
  update(tag: EnvironmentTag): Promise<EnvironmentTag | null>;
  delete(id: string): Promise<EnvironmentTag | null>;
  replaceAll(tags: EnvironmentTag[]): Promise<void>;
}

// ── 4.8 AppConfigStorageApi (single-record) ────────────────────────────────────

export interface AppConfigStorageApi {
  get(): Promise<AppConfigPersistedState>; // never returns null
  save(state: AppConfigPersistedState): Promise<void>;
  delete(): Promise<void>;
}

// ── 4.9 AgentStateStorageApi (single-record) ───────────────────────────────────

export interface AgentStateStorageApi {
  get(): Promise<AgentPersistedState>; // never returns null
  save(state: AgentPersistedState): Promise<void>;
  delete(): Promise<void>;
}

// ── 4.10 QueryBuilderStateStorageApi ──────────────────────────────────────────
// QB state is persisted directly in localStorage by useTableQueryBuilder.
// No storage API layer needed.

// ── 4.11 MigrationStateStorageApi ────────────────────────────────────────────

export interface MigrationStateStorageApi {
  get(): Promise<MigrationState | null>;
  save(names: string[]): Promise<void>;
  clear(): Promise<void>;
}

// ── 5. StorageApis — Factory Return Type ──────────────────────────────────────

export interface StorageApis {
  workspaceStorage: WorkspaceStorageApi;
  connectionStorage: ConnectionStorageApi;
  workspaceStateStorage: WorkspaceStateStorageApi;
  tabViewStorage: TabViewStorageApi;
  quickQueryLogStorage: QuickQueryLogStorageApi;
  rowQueryFileStorage: RowQueryFileStorageApi;
  environmentTagStorage: EnvironmentTagStorageApi;
  appConfigStorage: AppConfigStorageApi;
  agentStorage: AgentStateStorageApi;
  migrationStateStorage: MigrationStateStorageApi;
}
