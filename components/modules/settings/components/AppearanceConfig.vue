<script setup lang="ts">
import { THEME_MODE_OPTIONS } from '../constants';
import TableAppearanceConfig from './TableAppearanceConfig.vue';

const colorMode = useColorMode();
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-4">
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="lucide:sun" class="size-5!" /> Theme
      </h4>

      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Mode</p>
          <p class="text-xs text-muted-foreground">
            Choose between light, dark, or follow your system setting
          </p>
        </div>
        <div class="flex items-center rounded-md border p-0.5 gap-0.5">
          <Button
            v-for="option in THEME_MODE_OPTIONS"
            :key="option.value"
            type="button"
            size="xs"
            :variant="
              colorMode.preference === option.value ? 'default' : 'ghost'
            "
            @click="colorMode.preference = option.value"
            :aria-label="option.label"
            :aria-pressed="colorMode.preference === option.value"
            class="text-xs transition-colors"
          >
            <Icon :name="option.icon" class="size-3.5!" />
            {{ option.label }}
          </Button>
        </div>
      </div>
    </div>

    <hr class="border-border" />

    <TableAppearanceConfig />
  </div>
</template>
