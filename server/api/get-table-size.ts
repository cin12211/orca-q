import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(
  async (
    event
  ): Promise<{
    tableSize: string;
    dataSize: string;
    indexSize: string;
  }> => {
    const { dbConnectionString, tableName, schema } = await readBody(event);

    const resource = await getDatabaseSource({
      dbConnectionString,
      type: 'postgres',
    });

    const query = `
    SELECT
      pg_size_pretty(pg_total_relation_size(c.oid)) AS table_size,
      pg_size_pretty(pg_table_size(c.oid)) AS data_size,
      pg_size_pretty(pg_indexes_size(c.oid)) AS index_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_description d ON d.objoid = c.oid AND d.classoid = 'pg_class'::regclass
    WHERE n.nspname = $1 AND c.relname = $2
    LIMIT 1;
  `;

    const [result] = await resource.query(query, [schema, tableName]);

    if (!result) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found',
      });
    }

    return {
      tableSize: result.table_size,
      dataSize: result.data_size,
      indexSize: result.index_size,
    };
  }
);
