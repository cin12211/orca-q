import { getDatabaseSource } from '~/server/utils/db-connection';

export default defineEventHandler(async event => {
  const body: { dbConnectionString: string } = await readBody(event);

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  const result = await resource.query(`
    SELECT
        datname
    FROM
        pg_database;
    `);

  return result;
});
