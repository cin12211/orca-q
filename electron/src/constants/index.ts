export enum WorkspaceIpcChannels {
  Gets = 'workspaces:gets',
  GetOne = 'workspaces:get-one',
  Create = 'workspaces:create',
  Update = 'workspaces:update',
  Delete = 'workspaces:delete'
}

export enum WindowIpcChannels {
  UpdateTitle = 'window:update-window-title'
}

export const DEFAULT_PORT = 29091

export enum ConnectionIpcChannels {
  GetByWorkspaceId = 'connection:get-by-workspace-id',
  Gets = 'connection:gets',
  GetOne = 'connection:get-one',
  Create = 'connection:create',
  Update = 'connection:update',
  Delete = 'connection:delete'
}
