<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Toaster } from './components/ui/sonner';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

onMounted(async () => {
  const config = {
    dbConnectionString: 'postgres://admin:admin@localhost:5432/postgres',
  };

  try {
    const result = await ((window as any)?.api as any)?.connectDB(config);
    if (result.success) {
      console.log('Kết nối DB thành công!');
    } else {
      console.error('Kết nối thất bại:', result.error);
    }
  } catch (err) {
    console.error('Có lỗi khi gọi IPC:', err);
  }
});
</script>

<template>
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <ClientOnly>
    <Toaster position="top-right" />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
