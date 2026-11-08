export interface WorkspaceConnectionState {
  id: string; // connectionId
  schemaId: string;
  tabViewId?: string;
  sideBarExplorer?: unknown;
  sideBarSchemas?: unknown;
}

export interface WorkspaceState {
  id: string; // workspaceId (NOT a separate uuid)
  connectionId?: string;
  connectionStates?: WorkspaceConnectionState[];
  openedAt?: string;
  updatedAt?: string;
}
