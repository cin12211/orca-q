import { createError } from 'h3';
import type {
  FunctionSignature,
  FunctionParameter,
  RoutineMetadata,
  RenameFunctionResponse,
  UpdateFunctionResponse,
  DeleteFunctionResponse,
} from '~/core/types';
import { BaseDomainAdapter, toDatabaseHttpError } from '../../shared';
import { SupportedDatabaseType } from '../../shared';
import type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from '../types';

export class PostgresFunctionAdapter
  extends BaseDomainAdapter
  implements IDatabaseFunctionAdapter
{
  readonly dbType = SupportedDatabaseType.POSTGRES;

  static async create(
    params: DatabaseFunctionAdapterParams
  ): Promise<PostgresFunctionAdapter> {
    const adapter = await PostgresFunctionAdapter.resolveAdapter(
      params,
      SupportedDatabaseType.POSTGRES
    );
    return new PostgresFunctionAdapter(adapter);
  }

  async getFunctionSignature(
    functionId: string
  ): Promise<FunctionSignature | null> {
    const query = `
      SELECT
        p.proname AS name,
        n.nspname AS schema,
        pg_get_function_result(p.oid) AS return_type,
        pg_get_function_identity_arguments(p.oid) AS identity_args,
        p.proargnames AS arg_names,
        p.proargtypes::oid[] AS arg_types,
        p.proargmodes::text[] AS arg_modes,
        p.pronargdefaults AS num_defaults
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.oid = ?::oid
    `;

    const result = await this.adapter.rawQuery(query, [functionId]);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const parameters: FunctionParameter[] = [];

    if (row.identity_args && row.identity_args.trim()) {
      const argParts = row.identity_args
        .split(',')
        .map((s: string) => s.trim());

      for (let i = 0; i < argParts.length; i++) {
        const part = argParts[i];
        if (!part) continue;

        let mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC' = 'IN';
        let remaining = part;

        if (remaining.startsWith('INOUT ')) {
          mode = 'INOUT';
          remaining = remaining.substring(6);
        } else if (remaining.startsWith('OUT ')) {
          mode = 'OUT';
          remaining = remaining.substring(4);
        } else if (remaining.startsWith('IN ')) {
          mode = 'IN';
          remaining = remaining.substring(3);
        } else if (remaining.startsWith('VARIADIC ')) {
          mode = 'VARIADIC';
          remaining = remaining.substring(9);
        }

        const spaceIdx = remaining.indexOf(' ');
        let paramName: string;
        let paramType: string;

        if (spaceIdx > 0) {
          paramName = remaining.substring(0, spaceIdx);
          paramType = remaining.substring(spaceIdx + 1);
        } else {
          paramName = `param_${i + 1}`;
          paramType = remaining;
        }

        const numParams = argParts.length;
        const numDefaults = row.num_defaults || 0;
        const hasDefault = i >= numParams - numDefaults;

        parameters.push({
          name: paramName,
          type: paramType,
          mode,
          has_default: hasDefault,
          default_value: null,
        });
      }
    }

    return {
      name: row.name,
      schema: row.schema,
      parameters,
      return_type: row.return_type,
    };
  }

  async getOneFunction(functionId: string): Promise<string | null> {
    const query = `
      SELECT
        p.oid AS function_id,
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      WHERE p.oid = ?::oid;
    `;
    const result = await this.adapter.rawQuery(query, [functionId]);
    return result?.[0]?.function_definition || null;
  }

  async getOverviewFunctions(schema: string): Promise<RoutineMetadata[]> {
    const query = `
      SELECT 
        r.routine_name AS name,
        r.routine_schema AS schema,
        r.routine_type AS kind,
        pg_get_userbyid(p.proowner) AS owner,
        d.description AS comment
      FROM 
        information_schema.routines r
      JOIN 
        pg_proc p ON r.specific_name = p.proname || '_' || p.oid
      LEFT JOIN 
        pg_description d ON d.objoid = p.oid
      WHERE 
        r.routine_schema = ?;
    `;
    const result = await this.adapter.rawQuery(query, [schema]);
    return result;
  }

  async renameFunction(
    schemaName: string,
    oldName: string,
    newName: string
  ): Promise<RenameFunctionResponse> {
    try {
      const startTime = performance.now();
      const renameQuery = `ALTER FUNCTION "${schemaName}"."${oldName}" RENAME TO "${newName}";`;
      await this.adapter.rawQuery(renameQuery);
      const endTime = performance.now();

      return {
        success: true,
        queryTime: Number((endTime - startTime).toFixed(2)),
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }

  async updateFunction(
    functionDefinition: string
  ): Promise<UpdateFunctionResponse> {
    try {
      const startTime = performance.now();
      await this.adapter.rawQuery(functionDefinition);
      const endTime = performance.now();

      return {
        success: true,
        queryTime: Number((endTime - startTime).toFixed(2)),
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }

  async deleteFunction(
    schemaName: string,
    functionName: string,
    cascade?: boolean
  ): Promise<DeleteFunctionResponse> {
    try {
      const startTime = performance.now();
      const cascadeClause = cascade ? ' CASCADE' : '';
      const dropQuery = `DROP FUNCTION IF EXISTS "${schemaName}"."${functionName}"${cascadeClause};`;
      await this.adapter.rawQuery(dropQuery);
      const endTime = performance.now();

      return {
        success: true,
        queryTime: Number((endTime - startTime).toFixed(2)),
      };
    } catch (error) {
      throw toDatabaseHttpError(error);
    }
  }
}
