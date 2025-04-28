export default defineEventHandler<{
  body: { query: string };
}>(
  async (
    event
  ): Promise<{
    result: Record<string, any>[];
  }> => {
    const body: { query: string; connectionUrl: string } =
      await readBody(event);

    console.log('🚀 ~ body:', body);
    const resource = await getDatabaseSource({
      connectionUrl: body.connectionUrl,
      type: 'postgres',
    });

    const result = await resource.query(body.query);

    console.log('Query result:', result);

    return {
      result,
    };

    //   return result as Record<string, any>[];

    // const result = await executeQuery(body.query);

    // return {
    //   result,
    // };
  }
);
