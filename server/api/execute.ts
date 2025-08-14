import { type QueryFailedError } from 'typeorm';

export default defineEventHandler(
  async (
    event
  ): Promise<{
    result: Record<string, unknown>[];
    queryTime: number;
  }> => {
    try {
      const body: {
        query: string;
        dbConnectionString: string;
      } = await readBody(event);

      const startTime = performance.now();
      const resource = await getDatabaseSource({
        dbConnectionString: body.dbConnectionString,
        type: 'postgres',
      });
      const endTime = performance.now();
      const queryTime = Number((endTime - startTime).toFixed(2));

      const result: Record<string, unknown>[] = await resource.query(
        body.query
      );

      return {
        result,
        queryTime,
      };
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
