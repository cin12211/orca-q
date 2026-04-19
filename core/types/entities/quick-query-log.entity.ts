export interface QuickQueryLog {
  id: string;
  connectionId: string;
  workspaceId: string;
  schemaName: string;
  tableName: string;
  logs: string;
  queryTime: number; // milliseconds
  createdAt: string;
  updatedAt?: string;
  error?: Record<string, unknown>;
  errorMessage?: string;
}
