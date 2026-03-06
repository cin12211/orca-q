<script setup lang="ts">
import type { ProviderConfig } from '~/core/constants/agent';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';

defineProps<{
  currentProvider: ProviderConfig;
}>();

const { openSettings } = useSettingsModal();
</script>

<template>
  <div class="flex-1 flex items-center justify-center text-muted-foreground">
    <div class="text-center px-4">
      <Icon name="lucide:key" class="size-10 mb-3 opacity-50 mx-auto" />
      <p class="text-sm mb-1">
        No API key configured for {{ currentProvider.name }}
      </p>
      <p class="text-xs text-muted-foreground mb-3">
        Configure your API keys in Settings → Agent
      </p>
      <Button
        variant="outline"
        size="sm"
        class="text-xs"
        @click="openSettings('Agent')"
      >
        <Icon name="lucide:settings" class="size-3.5 mr-1" />
        Open Settings
      </Button>
    </div>
  </div>
</template>
