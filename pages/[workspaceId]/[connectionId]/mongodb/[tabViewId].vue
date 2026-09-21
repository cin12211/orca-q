<script setup lang="ts">
/**
 * RETIRED ROUTE — do not add logic here.
 *
 * This page used to render every tab type served by this route. Each type now
 * has its own page under quick-query/mongodb/{database,collection}.
 * Persisted tabs are moved over by MigrateTabViewRouteNames1740477873008, so
 * the only visitors left are stale history entries and hand-typed URLs. The
 * page exists purely to show them a way out.
 */
import { RetiredTabViewPage } from '~/components/base/tab-view-not-found';
</script>

<template>
  <RetiredTabViewPage />
</template>
