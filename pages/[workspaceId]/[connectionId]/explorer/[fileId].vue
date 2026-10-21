<script setup lang="ts">
import { BaseEmpty, LoadingOverlay } from '#components';
import { resolveRawQueryComponent } from '~/components/modules/driver/shared/raw-query/resolver';
import {
  provideRawQueryFileContent,
  provideRawQueryResultTabs,
} from '~/components/modules/raw-query/hooks';

//TODO: create lint check error for sql
// https://www.npmjs.com/package/node-sql-parser?activeTab=readme
// https://codemirror.net/examples/lint/

definePageMeta({
  keepalive: true,
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});

// Both live on the page so the engine entry can be swapped — on a connection
// change to another engine — without losing the file content or the result tabs.
const { connection, connectionsByWsId } = provideRawQueryFileContent();
provideRawQueryResultTabs();

/**
 * The connection store exposes no hydration flag. A workspace must own at least
 * one connection, so an empty list means the store is not hydrated yet. Once it
 * is, a still-undefined `connection` means the file's connection was deleted.
 */
const isStoreHydrated = computed(() => connectionsByWsId.value.length > 0);
const isConnectionMissing = computed(
  () => isStoreHydrated.value && !connection.value
);

const rawQueryComponent = computed(() =>
  resolveRawQueryComponent(connection.value?.type)
);
</script>

<template>
  <LoadingOverlay v-if="!isStoreHydrated" visible />

  <BaseEmpty
    v-else-if="isConnectionMissing"
    title="Connection not found"
    desc="The connection used by this file no longer exists."
  />

  <component :is="rawQueryComponent" v-else />
</template>
