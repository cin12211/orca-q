import type { Connection, TabView, Workspace } from '../stores';
import type {
  RowQueryFile,
  RowQueryFileContent,
} from '../stores/useExplorerFileStore';
import type { QuickQueryLog } from '../stores/useQuickQueryLogs';
import type { WorkspaceState } from '../stores/useWSStateStore';
import type {
  AgentPersistedState,
  AppConfigPersistedState,
} from './store-state';

// ── Shared filter / query types ──────────────────────────────────────

export interface GetTabViewsByContextProps {
  workspaceId: string;
  connectionId: string;
}

export interface DeleteTabViewProps {
  id?: string;
  connectionId?: string;
  schemaId?: string;
}

export interface GetQQueryLogsProps {
  connectionId: string;
}

export type DeleteQQueryLogsProps =
  | { workspaceId: string }
  | { connectionId: string }
  | { connectionId: string; schemaName: string; tableName: string };

// ── Per-entity API contracts ─────────────────────────────────────────

export interface WorkspacePersistApi {
  getAll(): Promise<Workspace[]>;
  getOne(id: string): Promise<Workspace | null>;
  create(workspace: Workspace): Promise<Workspace>;
  update(workspace: Workspace): Promise<Workspace | null>;
  delete(id: string): Promise<Workspace | null>;
}

export interface WorkspaceStatePersistApi {
  getAll(): Promise<WorkspaceState[]>;
  create(wsState: WorkspaceState): Promise<WorkspaceState>;
  update(wsState: WorkspaceState): Promise<WorkspaceState | null>;
  delete(id: string): Promise<WorkspaceState | null | void>;
}

export interface ConnectionPersistApi {
  getAll(): Promise<Connection[]>;
  getByWorkspaceId(workspaceId: string): Promise<Connection[]>;
  getOne(id: string): Promise<Connection | null>;
  create(connection: Connection): Promise<Connection>;
  update(connection: Connection): Promise<Connection | null>;
  delete(id: string): Promise<Connection | null | void>;
}

export interface TabViewsPersistApi {
  getAll(): Promise<TabView[]>;
  getByContext(props: GetTabViewsByContextProps): Promise<TabView[]>;
  create(tabView: TabView): Promise<TabView>;
  update(tabView: TabView): Promise<TabView | null>;
  delete(props: DeleteTabViewProps): Promise<TabView | null | void>;
  bulkDelete(propsArray: DeleteTabViewProps[]): Promise<TabView[] | void>;
}

export interface QuickQueryLogsPersistApi {
  getAll(): Promise<QuickQueryLog[]>;
  getByContext(props: GetQQueryLogsProps): Promise<QuickQueryLog[]>;
  create(qqLog: QuickQueryLog): Promise<QuickQueryLog>;
  update(qqLog: QuickQueryLog): Promise<QuickQueryLog | null>;
  delete(props: DeleteQQueryLogsProps): Promise<void>;
}

export interface RowQueryFilesPersistApi {
  getAllFiles(): Promise<RowQueryFile[]>;
  getFilesByContext(props: { workspaceId: string }): Promise<RowQueryFile[]>;
  createFiles(fileValue: RowQueryFile): Promise<RowQueryFile>;
  updateFile(
    fileValue: Partial<RowQueryFile> & { id: string }
  ): Promise<RowQueryFile | null>;
  updateFileContent(
    fileContent: RowQueryFileContent
  ): Promise<RowQueryFileContent | null>;
  getFileContentById(id: string): Promise<RowQueryFileContent | null>;
  deleteFile(props: { id: string }): Promise<void>;
  deleteFileByWorkspaceId(props: { wsId: string }): Promise<void>;
}

export interface AppConfigPersistApi {
  get(): Promise<AppConfigPersistedState | null>;
  save(state: AppConfigPersistedState): Promise<AppConfigPersistedState>;
  delete(): Promise<void>;
}

export interface AgentPersistApi {
  get(): Promise<AgentPersistedState | null>;
  save(state: AgentPersistedState): Promise<AgentPersistedState>;
  delete(): Promise<void>;
}

// ── Aggregated persist layer ─────────────────────────────────────────

export interface PersistApis {
  appConfigApi: AppConfigPersistApi;
  agentApi: AgentPersistApi;
  workspaceApi: WorkspacePersistApi;
  workspaceStateApi: WorkspaceStatePersistApi;
  connectionApi: ConnectionPersistApi;
  tabViewsApi: TabViewsPersistApi;
  quickQueryLogsApi: QuickQueryLogsPersistApi;
  rowQueryFilesApi: RowQueryFilesPersistApi;
}
