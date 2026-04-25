<script setup lang="ts">
import { Switch } from '#components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { NULL_ORDER_OPTIONS } from '../constants';

const appConfigStore = useAppConfigStore();
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-4">
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:security-check" class="size-5!" /> Safe Mode
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

    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:arrow-up-down" class="size-5!" /> Result Ordering
      </h4>

      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Null sort order</p>
          <p class="text-xs text-muted-foreground">
            Applied to quick-query ordering on databases that support explicit
            null placement.
          </p>
        </div>

        <Select
          :model-value="
            appConfigStore.tableAppearanceConfigs.nullOrderPreference
          "
          @update:model-value="
            value =>
              (appConfigStore.tableAppearanceConfigs.nullOrderPreference =
                value as typeof appConfigStore.tableAppearanceConfigs.nullOrderPreference)
          "
        >
          <SelectTrigger size="sm" class="h-7! min-w-36 cursor-pointer text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in NULL_ORDER_OPTIONS"
              :key="option.value"
              :value="option.value"
              class="text-xs"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>
