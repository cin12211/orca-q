export interface ViewOverviewMetadata {
  name: string;
  schema: string;
  type: string;
  owner: string;
  comment: string | null;
}

export default defineEventHandler(
  async (event): Promise<ViewOverviewMetadata[]> => {
    const body: { dbConnectionString: string; schema: string } =
      await readBody(event);

    const resource = await getDatabaseSource({
      dbConnectionString: body.dbConnectionString,
      type: 'postgres',
    });

    const result = await resource.query(`
      SELECT 
        c.relname AS name,
        n.nspname AS schema,
        CASE c.relkind
          WHEN 'v' THEN 'VIEW'
          WHEN 'm' THEN 'MATERIALIZED VIEW'
        END AS type,
        pg_get_userbyid(c.relowner) AS owner,
        d.description AS comment
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN pg_description d ON c.oid = d.objoid AND d.objsubid = 0
      WHERE n.nspname = '${body.schema}'
        AND c.relkind IN ('v', 'm')
      ORDER BY c.relname;
    `);

    return result;
  }
);
