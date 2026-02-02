import { getDatabaseSource } from '~/server/utils/db-connection';
import { ViewSchemaEnum } from '~/shared/types';

interface RequestBody {
  dbConnectionString: string;
  viewId: string;
  schemaName: string;
  viewName: string;
}

export interface ViewDefinitionResponse {
  viewName: string;
  schemaName: string;
  viewType: ViewSchemaEnum;
  definition: string;
}

export default defineEventHandler(
  async (event): Promise<ViewDefinitionResponse> => {
    const body: RequestBody = await readBody(event);

    const resource = await getDatabaseSource({
      dbConnectionString: body.dbConnectionString,
      type: 'postgres',
    });

    // Query to get view definition and type
    const result = await resource.query(`
    SELECT
      c.relname AS view_name,
      n.nspname AS schema_name,
      CASE c.relkind
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED_VIEW'
      END AS view_type,
      pg_get_viewdef(c.oid, true) AS definition
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = ${body.viewId}
      AND c.relkind IN ('v', 'm');
  `);

    const row = result?.[0];

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'View not found',
      });
    }

    // Construct the full DDL with CREATE statement
    const isMaterialized = row.view_type === 'MATERIALIZED_VIEW';
    const createPrefix = isMaterialized
      ? 'CREATE MATERIALIZED VIEW'
      : 'CREATE OR REPLACE VIEW';

    const fullDefinition = `${createPrefix} "${row.schema_name}"."${row.view_name}" AS
${row.definition}`;

    return {
      viewName: row.view_name,
      schemaName: row.schema_name,
      viewType: row.view_type as ViewSchemaEnum,
      definition: fullDefinition,
    };
  }
);
