import { executeQuery } from "~/server/utils/db-connection";

export default defineEventHandler(async (event) => {
  //   const body: { query: string } = await readBody(event);

  const result = await executeQuery(`
    SELECT
        datname
    FROM
        pg_database;
    `);
  return {
    result,
  };
});
