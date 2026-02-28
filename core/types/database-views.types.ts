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
