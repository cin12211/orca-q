<script setup lang="ts">
import type { ProviderConfig } from '~/core/constants/agent';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';

defineProps<{
  currentProvider: ProviderConfig;
}>();

const { openSettings } = useSettingsModal();
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] border border-border/70 bg-background/90 px-8 py-10 text-center shadow-sm">
    <div class="mb-4 flex size-16 items-center justify-center rounded-3xl border bg-muted/40">
      <Icon name="lucide:key-round" class="size-7 text-muted-foreground" />
    </div>

    <h2 class="text-xl font-semibold tracking-tight">
      Connect {{ currentProvider.name }}
    </h2>
    <p class="mt-2 text-sm leading-6 text-muted-foreground">
      Add an API key in Settings so the agent can answer questions, inspect schema
      context, and keep chat history in this workspace.
    </p>

    <Button
      variant="outline"
      class="mt-6 rounded-2xl"
      @click="openSettings('Agent')"
    >
      <Icon name="lucide:settings-2" class="mr-2 size-4" />
      Open Agent Settings
    </Button>
  </div>
</template>
