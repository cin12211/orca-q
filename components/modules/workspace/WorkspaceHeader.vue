<script setup lang="ts">
import { Button } from '@/components/ui/button';
import CreateWorkspaceModal from './CreateWorkspaceModal.vue';

const isOpenEditModal = ref(false);
</script>

<template>
  <CreateWorkspaceModal v-model:open="isOpenEditModal" v-if="isOpenEditModal" />

  <div class="flex items-center justify-between mt-2">
    <div class="container flex flex-col items-start gap-1 py-2">
      <h1
        class="text-3xl flex items-center gap-2 font-bold leading-tight tracking-tighter lg:leading-[1.1]"
      >
        Hello
        <Icon name="hugeicons:waving-hand-01" />
      </h1>
      <p class="max-w-2xl text-lg font-light text-foreground">
        Welcome to your workspaces
      </p>
    </div>
    <div>
      <Button size="lg" @click="isOpenEditModal = true">
        <Icon name="lucide:plus" />

        New Workspace</Button
      >
    </div>
  </div>
</template>
