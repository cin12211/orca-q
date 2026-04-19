export enum TabViewType {
  AllERD = 'AllERD',
  DetailERD = 'DetailERD',
  TableOverview = 'TableOverview',
  TableDetail = 'tableDetail',

  FunctionsOverview = 'FunctionsOverview',
  FunctionsDetail = 'FunctionsDetail',

  ViewOverview = 'ViewOverview',
  ViewDetail = 'ViewDetail',

  CodeQuery = 'CodeQuery',

  UserPermissions = 'UserPermissions',
  DatabaseTools = 'DatabaseTools',
  InstanceInsights = 'InstanceInsights',
  Connection = 'Connection',
  Explorer = 'Explorer',
  Schema = 'Schema',
  Export = 'Export',
  AgentChat = 'AgentChat',
}

export interface BaseTabMetadata {
  type: TabViewType;
  treeNodeId?: string;
  [key: string]: any;
}

export interface TableDetailMetadata extends BaseTabMetadata {
  type: TabViewType.TableDetail;
  tableName: string;
}

export interface ViewDetailMetadata extends BaseTabMetadata {
  type: TabViewType.ViewDetail;
  virtualTableId: string;
  viewName: string;
}

export interface FunctionDetailMetadata extends BaseTabMetadata {
  type: TabViewType.FunctionsDetail;
  functionId: string;
}

export interface ErdDetailMetadata extends BaseTabMetadata {
  type: TabViewType.DetailERD | TabViewType.AllERD;
  tableName?: string;
}

export interface CodeQueryMetadata extends BaseTabMetadata {
  type: TabViewType.CodeQuery;
  tableName?: string;
  queryId?: string;
}

export interface AgentChatMetadata extends BaseTabMetadata {
  type: TabViewType.AgentChat;
  historyId?: string;
}

export type TabMetadata =
  | TableDetailMetadata
  | ViewDetailMetadata
  | FunctionDetailMetadata
  | ErdDetailMetadata
  | CodeQueryMetadata
  | AgentChatMetadata
  | BaseTabMetadata;

export type TabView = {
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  id: string;
  index: number;
  name: string;
  icon: string;
  iconClass?: string;
  type: TabViewType;
  routeName: string;
  routeParams?: Record<string, string | number>;
  metadata?: TabMetadata;
};
