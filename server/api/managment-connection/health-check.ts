import { healthCheckConnection } from "~/server/utils/db-connection";

export default defineEventHandler(
  async (event): Promise<{ isConnectedSuccess: boolean }> => {
    const isConnectedSuccess = await healthCheckConnection();

    return {
      isConnectedSuccess,
    };
  }
);
