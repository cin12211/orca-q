<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { TooltipProvider } from '#components';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Toaster } from './components/ui/sonner';
import { DEFAULT_DEBOUNCE_INPUT } from './utils/constants';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);
</script>

<template>
  <NuxtLoadingIndicator />
  <TooltipProvider :delay-duration="DEFAULT_DEBOUNCE_INPUT">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </TooltipProvider>

  <ClientOnly>
    <Toaster position="top-right" />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
