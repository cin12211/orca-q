import { createError } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import { duckdbDialect } from '~~/app/core/sql-dialect';
import type { FunctionSignature, RoutineMetadata } from '~~/app/core/types';
import type { IDatabaseAdapter } from '~~/server/infrastructure/driver';
import { getDatabaseSource } from '~~/server/infrastructure/driver/db-connection';
import { BaseUnsupportedFunctionAdapter } from '../shared/base-unsupported-function.adapter';
import type { DatabaseFunctionAdapterParams } from '../types';

export const DUCKDB_TABLE_MACRO = 'table_macro';

// DuckDB has no user-defined SQL functions: macros are what fills this slot.
const USER_MACROS_FILTER = `
  database_name = current_database()
  AND NOT internal
  AND function_type IN ('macro', '${DUCKDB_TABLE_MACRO}')
`;

interface DuckDbMacroRow {
  schema_name: string;
  function_name: string;
  function_type: string;
  parameters: string[];
  macro_definition: string | null;
}

export class DuckDbFunctionAdapter extends BaseUnsupportedFunctionAdapter {
  readonly dbType = DatabaseClientType.DUCKDB;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: DatabaseFunctionAdapterParams
  ): Promise<DuckDbFunctionAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.DUCKDB,
    });

    return new DuckDbFunctionAdapter(adapter);
  }

  private async getMacro(macroId: string): Promise<DuckDbMacroRow | null> {
    const [row] = await this.adapter.rawQuery<DuckDbMacroRow>(
      `
        SELECT schema_name, function_name, function_type, parameters, macro_definition
        FROM duckdb_functions()
        WHERE ${USER_MACROS_FILTER}
          AND function_oid = CAST(? AS BIGINT)
      `,
      [macroId]
    );

    return row ?? null;
  }

  override async getOverviewFunctions(
    schema: string
  ): Promise<RoutineMetadata[]> {
    return this.adapter.rawQuery<RoutineMetadata>(
      `
        SELECT
          function_name AS name,
          schema_name AS "schema",
          CASE function_type
            WHEN '${DUCKDB_TABLE_MACRO}' THEN 'TABLE MACRO'
            ELSE 'MACRO'
          END AS kind,
          schema_name AS owner,
          description AS comment
        FROM duckdb_functions()
        WHERE ${USER_MACROS_FILTER}
          AND schema_name = ?
        ORDER BY function_name
      `,
      [schema]
    );
  }

  override async getOneFunction(macroId: string): Promise<string | null> {
    const macro = await this.getMacro(macroId);

    if (!macro) {
      throw createError({ statusCode: 404, statusMessage: 'Macro not found' });
    }

    const name = duckdbDialect.qualifyTableName(
      macro.function_name,
      macro.schema_name
    );
    const body =
      macro.function_type === DUCKDB_TABLE_MACRO
        ? `TABLE ${macro.macro_definition}`
        : macro.macro_definition;

    return `CREATE MACRO ${name}(${macro.parameters.join(', ')}) AS ${body};`;
  }

  override async getFunctionSignature(
    macroId: string
  ): Promise<FunctionSignature | null> {
    const macro = await this.getMacro(macroId);

    if (!macro) {
      return null;
    }

    return {
      name: macro.function_name,
      schema: macro.schema_name,
      // Macros are untyped: their arguments take any type the body accepts.
      parameters: macro.parameters.map(name => ({
        name,
        type: 'ANY',
        mode: 'IN',
        has_default: false,
        default_value: null,
      })),
      return_type: macro.function_type === DUCKDB_TABLE_MACRO ? 'TABLE' : 'ANY',
    };
  }
}
