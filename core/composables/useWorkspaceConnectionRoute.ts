type RouteParamValue = string | number | (string | number)[] | undefined;

const normalizeRouteParam = (value: RouteParamValue) => {
  if (Array.isArray(value)) {
    return value[0]?.toString() ?? '';
  }

  return value?.toString() ?? '';
};

export const useWorkspaceConnectionRoute = () => {
  const route = useRoute();
  const params = computed(
    () =>
      route.params as Partial<
        Record<'workspaceId' | 'connectionId', RouteParamValue>
      >
  );

  const workspaceId = computed(() =>
    normalizeRouteParam(params.value.workspaceId)
  );

  const connectionId = computed(() =>
    normalizeRouteParam(params.value.connectionId)
  );

  return {
    workspaceId,
    connectionId,
  };
};
