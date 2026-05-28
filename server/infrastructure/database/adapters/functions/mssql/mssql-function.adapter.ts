import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  DeleteFunctionResponse,
  FunctionSignature,
  FunctionParameter,
  RenameFunctionResponse,
  RoutineMetadata,
  UpdateFunctionResponse,
} from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from '../types';

export class MssqlFunctionAdapter
  extends BaseDomainAdapter
  implements IDatabaseFunctionAdapter
{
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseFunctionAdapterParams
  ): Promise<MssqlFunctionAdapter> {
    const adapter = await MssqlFunctionAdapter.resolveAdapter(
      params,
      DatabaseClientType.MSSQL
    );
    return new MssqlFunctionAdapter(adapter);
  }

  /**
   * List all functions and stored procedures in the given schema.
   * kind: 'FUNCTION' | 'PROCEDURE'
   */
  async getOverviewFunctions(schema: string): Promise<RoutineMetadata[]> {
    const query = `
      SELECT
        r.ROUTINE_NAME        AS name,
        r.ROUTINE_SCHEMA      AS [schema],
        r.ROUTINE_TYPE        AS kind,
        SUSER_SNAME(o.principal_id) AS owner,
        ep.value              AS comment
      FROM INFORMATION_SCHEMA.ROUTINES r
      JOIN sys.objects o
        ON o.name = r.ROUTINE_NAME
        AND o.schema_id = SCHEMA_ID(r.ROUTINE_SCHEMA)
      LEFT JOIN sys.extended_properties ep
        ON ep.major_id = o.object_id
        AND ep.minor_id = 0
        AND ep.name = 'MS_Description'
      WHERE r.ROUTINE_SCHEMA = ?
      ORDER BY r.ROUTINE_TYPE, r.ROUTINE_NAME
    `;

    const result = await this.adapter.rawQuery<{
      name: string;
      schema: string;
      kind: string;
      owner: string | null;
      comment: string | null;
    }>(query, [schema]);

    return (result ?? []).map(row => ({
      name: row.name,
      schema: row.schema,
      kind: row.kind, // 'FUNCTION' or 'PROCEDURE'
      owner: row.owner ?? '',
      comment: row.comment ?? null,
    }));
  }

  /**
   * Get the full T-SQL definition of a routine by name (schema.name).
   * functionId format: "schema.name"
   */
  async getOneFunction(functionId: string): Promise<string | null> {
    const [schema, name] = this._parseFunctionId(functionId);

    const query = `
      SELECT m.definition
      FROM sys.sql_modules m
      JOIN sys.objects o ON o.object_id = m.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = ? AND o.name = ?
    `;

    const result = await this.adapter.rawQuery<{ definition: string }>(query, [
      schema,
      name,
    ]);

    return result?.[0]?.definition ?? null;
  }

  /**
   * Get parameter info for a function/procedure.
   * functionId format: "schema.name"
   */
  async getFunctionSignature(
    functionId: string
  ): Promise<FunctionSignature | null> {
    const [schema, name] = this._parseFunctionId(functionId);

    const paramQuery = `
      SELECT
        p.name          AS param_name,
        t.name          AS param_type,
        p.is_output     AS is_output,
        p.has_default_value AS has_default
      FROM sys.parameters p
      JOIN sys.objects o ON o.object_id = p.object_id
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      JOIN sys.types t ON t.user_type_id = p.user_type_id
      WHERE s.name = ? AND o.name = ?
      ORDER BY p.parameter_id
    `;

    const retQuery = `
      SELECT t.name AS return_type
      FROM sys.objects o
      JOIN sys.schemas s ON s.schema_id = o.schema_id
      JOIN sys.columns c ON c.object_id = o.object_id
      JOIN sys.types t ON t.user_type_id = c.user_type_id
      WHERE s.name = ? AND o.name = ?
        AND o.type IN ('FN', 'TF', 'IF')
    `;

    const [paramRows, retRows] = await Promise.all([
      this.adapter.rawQuery<{
        param_name: string;
        param_type: string;
        is_output: boolean;
        has_default: boolean;
      }>(paramQuery, [schema, name]),
      this.adapter.rawQuery<{ return_type: string }>(retQuery, [schema, name]),
    ]);

    if (!paramRows) return null;

    const parameters: FunctionParameter[] = (paramRows ?? []).map(p => ({
      name: p.param_name,
      type: p.param_type,
      mode: p.is_output ? 'OUT' : 'IN',
      has_default: p.has_default,
      default_value: null,
    }));

    return {
      name,
      schema,
      parameters,
      return_type: retRows?.[0]?.return_type ?? 'void',
    };
  }

  async renameFunction(
    schemaName: string,
    oldName: string,
    newName: string
  ): Promise<RenameFunctionResponse> {
    try {
      const startTime = performance.now();
      // sp_rename works for both functions and procedures
      await this.adapter.rawQuery(
        `EXEC sp_rename '[${schemaName}].[${oldName}]', '${newName}'`
      );
      return {
        success: true,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        message: error?.message ?? 'Failed to rename function',
      });
    }
  }

  async updateFunction(
    functionDefinition: string
  ): Promise<UpdateFunctionResponse> {
    try {
      const startTime = performance.now();
      await this.adapter.rawQuery(functionDefinition);
      return {
        success: true,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        message: error?.message ?? 'Failed to update function',
      });
    }
  }

  async deleteFunction(
    schemaName: string,
    functionName: string,
    _cascade?: boolean
  ): Promise<DeleteFunctionResponse> {
    try {
      const startTime = performance.now();

      // Check if it's a procedure or function first
      const typeResult = await this.adapter.rawQuery<{ type: string }>(
        `SELECT o.type FROM sys.objects o
         JOIN sys.schemas s ON s.schema_id = o.schema_id
         WHERE s.name = ? AND o.name = ?`,
        [schemaName, functionName]
      );

      const objType = typeResult?.[0]?.type?.trim();
      let dropSql: string;

      if (objType === 'P') {
        dropSql = `DROP PROCEDURE IF EXISTS [${schemaName}].[${functionName}]`;
      } else {
        dropSql = `DROP FUNCTION IF EXISTS [${schemaName}].[${functionName}]`;
      }

      await this.adapter.rawQuery(dropSql);

      return {
        success: true,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        message: error?.message ?? 'Failed to delete function',
      });
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private _parseFunctionId(functionId: string): [string, string] {
    const dotIdx = functionId.indexOf('.');
    if (dotIdx > 0) {
      return [functionId.slice(0, dotIdx), functionId.slice(dotIdx + 1)];
    }
    return ['dbo', functionId];
  }
}
