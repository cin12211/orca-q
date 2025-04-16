<script setup lang="ts">
const route = useRoute();

const isFileRoute = computed(() =>
  route.path.startsWith("/activity/code-editor")
);

const isSchemaRoute = computed(() =>
  route.path.startsWith("/activity/schemas")
);
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-sidebar">
    <!-- <KeepAlive>
      <ModulesManagementExplorer v-if="isFileRoute" />
    </KeepAlive>

    <KeepAlive>
      <ModulesManagementSchemas v-if="isSchemaRoute" />
    </KeepAlive> -->

    <ModulesManagementExplorer :class="[isFileRoute ? '' : 'hidden']" />

    <ModulesManagementSchemas :class="[isSchemaRoute ? '' : 'hidden']" />
  </div>
</template>
