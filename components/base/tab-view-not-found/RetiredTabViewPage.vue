<script setup lang="ts">
import { BaseEmpty } from '~/components/base/base-empty';
import { Button } from '~/components/ui/button';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { TAB_VIEW_ROUTE_NAMES } from '~/core/constants/tab-view-routes';

/**
 * Placeholder for routes that used to serve several tab types before each type
 * got its own page. Nothing opens these routes any more, so the only visitors
 * are stale history entries and links; both are offered a way forward.
 */
const { connectionId, tabInfo, workspaceId } = useTabViewPage();
const router = useRouter();

const replacementRouteName = computed(() => {
  const routeName = tabInfo.value && TAB_VIEW_ROUTE_NAMES[tabInfo.value.type];

  return routeName && router.hasRoute(routeName) ? routeName : null;
});

const connectionRouteParams = computed(() => ({
  workspaceId: workspaceId.value,
  connectionId: connectionId.value,
}));

const openReplacement = async () => {
  const routeName = replacementRouteName.value;

  if (!routeName) {
    return;
  }

  await navigateTo(
    {
      name: routeName,
      params: {
        ...tabInfo.value?.routeParams,
        ...connectionRouteParams.value,
      } as never,
    },
    { replace: true }
  );
};

const backToConnection = async () => {
  await navigateTo(
    {
      name: 'workspaceId-connectionId',
      params: connectionRouteParams.value,
    },
    { replace: true }
  );
};
</script>

<template>
  <BaseEmpty
    title="Page not found"
    desc="This page has moved. Each tab now opens on its own page."
  >
    <div class="flex items-center justify-center gap-2">
      <Button size="sm" variant="outline" @click="backToConnection">
        Back to connection
      </Button>

      <Button size="sm" v-if="replacementRouteName" @click="openReplacement">
        Replace this page
      </Button>
    </div>
  </BaseEmpty>
</template>
