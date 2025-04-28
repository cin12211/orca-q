import { getDatabaseSource } from '~/server/utils/db-connection';

export default defineEventHandler(async event => {
  const body: { connectionUrl: string } = await readBody(event);

  const resource = await getDatabaseSource({
    connectionUrl: body.connectionUrl,
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
