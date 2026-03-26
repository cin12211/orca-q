export const connectionService = {
  healthCheck: (body: any) =>
    $fetch<{ isConnectedSuccess: boolean }>(
      '/api/managment-connection/health-check',
      {
        method: 'POST',
        body,
      }
    ),
};
