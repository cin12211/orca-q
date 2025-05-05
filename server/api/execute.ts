import { json } from 'stream/consumers';
import { type QueryFailedError } from 'typeorm';

export default defineEventHandler(
  async (event): Promise<Record<string, unknown>[]> => {
    try {
      const body: { query: string; connectionUrl: string } =
        await readBody(event);

      console.log('🚀 ~ body:', body);

      const resource = await getDatabaseSource({
        connectionUrl: body.connectionUrl,
        type: 'postgres',
      });

      const result: Record<string, unknown>[] = await resource.query(
        body.query
      );

      console.log('Query result:', result);

      return result;
    } catch (error) {
      const queryError: QueryFailedError = error as unknown as QueryFailedError;

      throw createError({
        statusCode: 500,
        statusMessage: queryError.message,
        cause: queryError.cause,
        data: queryError.driverError,
        message: queryError.message,
      });
    }
  }
);
