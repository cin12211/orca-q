import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  FunctionSignature,
  RoutineMetadata,
  RenameFunctionResponse,
  UpdateFunctionResponse,
  DeleteFunctionResponse,
} from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseFunctionAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseFunctionAdapter {
  readonly dbType: DatabaseClientType;

  getFunctionSignature(functionId: string): Promise<FunctionSignature | null>;
  getOneFunction(functionId: string): Promise<string | null>;
  getOverviewFunctions(schema: string): Promise<RoutineMetadata[]>;
  renameFunction(
    schemaName: string,
    oldName: string,
    newName: string
  ): Promise<RenameFunctionResponse>;
  updateFunction(functionDefinition: string): Promise<UpdateFunctionResponse>;
  deleteFunction(
    schemaName: string,
    functionName: string,
    cascade?: boolean
  ): Promise<DeleteFunctionResponse>;
}
