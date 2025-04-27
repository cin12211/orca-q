import { healthCheckConnection } from '~/server/utils/db-connection';

export default defineEventHandler(
  async (event): Promise<{ isConnectedSuccess: boolean }> => {
    const body: { stringConnection: string } = await readBody(event);

    const isConnectedSuccess = await healthCheckConnection({
      url: body.stringConnection,
    });

    return {
      isConnectedSuccess,
    };
  }
);
