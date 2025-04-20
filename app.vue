<script setup lang="ts">
import { Toaster } from './components/ui/sonner';
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
