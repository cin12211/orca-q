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
