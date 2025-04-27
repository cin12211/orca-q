<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Toaster } from './components/ui/sonner';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);
</script>

<template>
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <ClientOnly>
    <Toaster />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
