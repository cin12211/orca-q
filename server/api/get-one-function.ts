export default defineEventHandler(async (event): Promise<string> => {
  const body: {
    dbConnectionString: string;
    functionId: string;
  } = await readBody(event);

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  const result = await resource.query(`
        SELECT
          p.oid AS function_id,
          p.proname AS function_name,
          pg_get_functiondef(p.oid) AS function_definition
       FROM pg_proc p
       WHERE p.oid = ${body.functionId};
`);

  return result?.[0]?.function_definition;
});
