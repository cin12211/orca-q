import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ViewOverviewMetadata,
  ViewDefinitionResponse,
} from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseViewAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseViewAdapter {
  readonly dbType: DatabaseClientType;

  getOverviewViews(schema: string): Promise<ViewOverviewMetadata[]>;
  getViewDefinition(viewId: string): Promise<ViewDefinitionResponse>;
}
