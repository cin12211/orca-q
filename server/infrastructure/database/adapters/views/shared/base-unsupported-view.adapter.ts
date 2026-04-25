import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  TableIndex,
  ViewColumn,
  ViewDefinitionResponse,
  ViewDependency,
  ViewMeta,
  ViewOverviewMetadata,
} from '~/core/types';
import type { IDatabaseViewAdapter } from '../types';

function getDatabaseLabel(dbType: DatabaseClientType): string {
  switch (dbType) {
    case DatabaseClientType.MYSQL:
      return 'MySQL';
    case DatabaseClientType.MARIADB:
      return 'MariaDB';
    case DatabaseClientType.ORACLE:
      return 'Oracle';
    case DatabaseClientType.SQLITE3:
      return 'SQLite';
    default:
      return dbType;
  }
}

export abstract class BaseUnsupportedViewAdapter
  implements IDatabaseViewAdapter
{
  abstract readonly dbType: DatabaseClientType;

  protected unsupported(operation: string): never {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(this.dbType)} view tooling does not support ${operation}`,
      data: {
        dbType: this.dbType,
        feature: 'views',
        operation,
      },
    });
  }

  async getOverviewViews(_schema: string): Promise<ViewOverviewMetadata[]> {
    return this.unsupported('listing views');
  }

  async getViewDefinition(_viewId: string): Promise<ViewDefinitionResponse> {
    return this.unsupported('loading view definitions');
  }

  async getViewMeta(_schema: string, _viewName: string): Promise<ViewMeta> {
    return this.unsupported('loading view metadata');
  }

  async getViewColumns(
    _schema: string,
    _viewName: string
  ): Promise<ViewColumn[]> {
    return this.unsupported('loading view columns');
  }

  async getViewDependencies(
    _schema: string,
    _viewName: string
  ): Promise<ViewDependency[]> {
    return this.unsupported('loading view dependencies');
  }

  async getViewIndexes(
    _schema: string,
    _viewName: string
  ): Promise<TableIndex[]> {
    return this.unsupported('loading view indexes');
  }

  async getViewExplainPlan(
    _schema: string,
    _viewName: string
  ): Promise<string> {
    return this.unsupported('explaining views');
  }
}
