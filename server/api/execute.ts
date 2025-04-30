export default defineEventHandler(
  async (event): Promise<Record<string, unknown>[]> => {
    const body: { query: string; connectionUrl: string } =
      await readBody(event);

    console.log('🚀 ~ body:', body);

    const resource = await getDatabaseSource({
      connectionUrl: body.connectionUrl,
      type: 'postgres',
    });

    const result: Record<string, unknown>[] = await resource.query(body.query);

    console.log('Query result:', result);

    return result;
  }
);
