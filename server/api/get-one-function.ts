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
        SELECT pg_get_functiondef('${body.functionId}'::regproc) as def;`);

  return result?.[0]?.def;
});
