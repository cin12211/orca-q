<script setup lang="ts">
import { Switch } from '#components';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

const appConfigStore = useAppConfigStore();
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-2">
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="lucide:shield-check" class="size-5!" /> Safe Mode
      </h4>

      <div class="flex flex-col space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm">Enable Safe Mode</p>
            <p class="text-xs text-muted-foreground">
              Show confirmation dialog with SQL preview before executing
              save/delete operations
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <Switch
              v-model="appConfigStore.quickQuerySafeModeEnabled"
              @update:modelValue="
                appConfigStore.quickQuerySafeModeEnabled = $event
              "
              id="safe-mode-toggle"
              class="cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
