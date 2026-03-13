import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ViewOverviewMetadata,
  ViewDefinitionResponse,
  ViewMeta,
  ViewDependency,
  ViewColumn,
  TableIndex,
} from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseViewAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseViewAdapter {
  readonly dbType: DatabaseClientType;

  getOverviewViews(schema: string): Promise<ViewOverviewMetadata[]>;
  getViewDefinition(viewId: string): Promise<ViewDefinitionResponse>;
  getViewMeta(schema: string, viewName: string): Promise<ViewMeta>;
  getViewColumns(schema: string, viewName: string): Promise<ViewColumn[]>;
  getViewDependencies(
    schema: string,
    viewName: string
  ): Promise<ViewDependency[]>;
  getViewIndexes(schema: string, viewName: string): Promise<TableIndex[]>;
  getViewExplainPlan(schema: string, viewName: string): Promise<string>;
}
