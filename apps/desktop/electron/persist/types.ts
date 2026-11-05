export interface DeleteTabViewProps {
  id?: string;
  connectionId?: string;
  schemaId?: string;
}

export type DeleteQQueryLogsProps =
  | { workspaceId: string }
  | { connectionId: string }
  | { connectionId: string; schemaName: string; tableName: string };
