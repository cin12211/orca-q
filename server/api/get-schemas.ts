import { executeQuery } from '~/server/utils/db-connection';

export default defineEventHandler(async event => {
  //   const body: { query: string } = await readBody(event);

  const result = await executeQuery(`
        select
            schema_name
        from
            information_schema.schemata;
    `);
  return {
    result,
  };
});
