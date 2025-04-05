export enum TreeItemType {
  FOLDER = "folder",
  CONFIG_FOLDER = "config_folder",
  SRC_FOLDER = "src_folder",
  APP_FOLDER = "app_folder",
  ROUTES_FOLDER = "routes_folder",
  TYPES_FOLDER = "types_folder",
  PAGES_FOLDER = "pages_folder",
  TS = "ts",
  TSX = "tsx",
  FILE = "file",
}

export interface BaseItem {
  id: string;
  name: string;
  type: TreeItemType;
}

export interface FileItem extends BaseItem {
  // File-specific properties
}

export interface FolderItem extends BaseItem {
  expanded: boolean;
  children: (FolderItem | FileItem)[];
}

export type TreeItem = FolderItem | FileItem;
