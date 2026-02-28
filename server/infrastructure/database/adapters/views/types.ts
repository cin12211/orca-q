import type {
  ViewOverviewMetadata,
  ViewDefinitionResponse,
} from '~/core/types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseType,
} from '../shared';

export type DatabaseViewAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseViewAdapter {
  readonly dbType: SupportedDatabaseType;

  getOverviewViews(schema: string): Promise<ViewOverviewMetadata[]>;
  getViewDefinition(viewId: string): Promise<ViewDefinitionResponse>;
}
