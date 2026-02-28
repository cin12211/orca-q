import type {
  FunctionSignature,
  RoutineMetadata,
  RenameFunctionResponse,
  UpdateFunctionResponse,
  DeleteFunctionResponse,
} from '~/core/types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseType,
} from '../shared';

export type DatabaseFunctionAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseFunctionAdapter {
  readonly dbType: SupportedDatabaseType;

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
