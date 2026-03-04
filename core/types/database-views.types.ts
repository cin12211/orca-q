import { type ViewSchemaEnum } from '~/core/types/schemaMeta.type';

export interface ViewOverviewMetadata {
  name: string;
  schema: string;
  type: string;
  owner: string;
  comment: string | null;
}

export interface ViewDefinitionResponse {
  viewName: string;
  schemaName: string;
  viewType: ViewSchemaEnum;
  definition: string;
}

// --- View Type Metadata ---

export interface ViewMeta {
  type: 'normal' | 'materialized';
  isUpdatable?: boolean;
  securityBarrier?: boolean;
  isPopulated?: boolean;
  totalSize?: string;
  tableSize?: string;
  indexSize?: string;
  rowEstimate?: number;
}

export interface ViewDependency {
  dependsOn: string;
}

export interface ViewColumn {
  columnName: string;
  dataType: string;
  isNullable: string;
  defaultValue: string | null;
}

export interface ViewExplainPlan {
  plan: string;
}
