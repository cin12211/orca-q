import { getDatabaseSource } from '~/server/utils/db-connection';

export default defineEventHandler(async event => {
  const body: { connectionUrl: string } = await readBody(event);

  const resource = await getDatabaseSource({
    connectionUrl: body.connectionUrl,
    type: 'postgres',
  });

  const result = await resource.query(`
        	SELECT
            nsp.nspname AS name,
            -- tables
            (
              SELECT json_agg(table_name)
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'BASE TABLE'
            ) AS tables,
            -- views
            (
              SELECT json_agg(table_name)
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'VIEW'
            ) AS views,
            -- functions
            (
              SELECT json_agg(routine_name)
              FROM information_schema.routines r
              WHERE r.routine_schema = nsp.nspname
                AND r.routine_type = 'FUNCTION'
            ) AS functions
          FROM pg_namespace nsp
          WHERE
            has_schema_privilege(current_user, nsp.nspname, 'USAGE')
            -- loại bỏ schema hệ thống
            AND nsp.nspname NOT LIKE 'pg_%'
            AND nsp.nspname <> 'information_schema';
    `);
  console.log('Query result:', result);

  return result;

  // const result = await executeQuery(`
  //       select
  //           schema_name
  //       from
  //           information_schema.schemata;
  //   `);
  // return {
  //   result,
  // };
});
