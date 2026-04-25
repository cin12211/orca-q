import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  DeleteFunctionResponse,
  FunctionSignature,
  RenameFunctionResponse,
  RoutineMetadata,
  UpdateFunctionResponse,
} from '~/core/types';
import type { IDatabaseFunctionAdapter } from '../types';

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

export abstract class BaseUnsupportedFunctionAdapter
  implements IDatabaseFunctionAdapter
{
  abstract readonly dbType: DatabaseClientType;

  protected unsupported(operation: string): never {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(this.dbType)} function tooling does not support ${operation}`,
      data: {
        dbType: this.dbType,
        feature: 'functions',
        operation,
      },
    });
  }

  async getFunctionSignature(
    _functionId: string
  ): Promise<FunctionSignature | null> {
    return this.unsupported('loading function signatures');
  }

  async getOneFunction(_functionId: string): Promise<string | null> {
    return this.unsupported('loading function definitions');
  }

  async getOverviewFunctions(_schema: string): Promise<RoutineMetadata[]> {
    return this.unsupported('listing functions');
  }

  async renameFunction(
    _schemaName: string,
    _oldName: string,
    _newName: string
  ): Promise<RenameFunctionResponse> {
    return this.unsupported('renaming functions');
  }

  async updateFunction(
    _functionDefinition: string
  ): Promise<UpdateFunctionResponse> {
    return this.unsupported('updating functions');
  }

  async deleteFunction(
    _schemaName: string,
    _functionName: string,
    _cascade?: boolean
  ): Promise<DeleteFunctionResponse> {
    return this.unsupported('deleting functions');
  }
}
