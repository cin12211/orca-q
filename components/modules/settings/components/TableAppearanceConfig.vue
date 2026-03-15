<script setup lang="ts">
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  HEADER_FONT_WEIGHT_OPTIONS,
  TABLE_FONT_SIZE_OPTIONS,
  TABLE_HEADER_FONT_SIZE_OPTIONS,
  TABLE_ROW_HEIGHT_RANGE,
} from '../constants/settings.constants';
import TableAppearancePreview from './TableAppearancePreview.vue';

const appConfigStore = useAppConfigStore();
const colorMode = useColorMode();

const configs = computed(() => appConfigStore.tableAppearanceConfigs);

const previewAccentColor = computed(() =>
  colorMode.value === 'dark'
    ? configs.value.accentColorDark
    : configs.value.accentColorLight
);

const previewHeaderBg = computed(() =>
  colorMode.value === 'dark'
    ? configs.value.headerBackgroundColorDark
    : configs.value.headerBackgroundColorLight
);
</script>

<template>
  <div class="flex flex-col gap-4 pb-4">
    <!-- Section header -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <h4
          class="text-sm font-medium leading-7 text-primary flex items-center gap-1"
        >
          <Icon name="hugeicons:table-02" class="size-5!" /> Table Appearance
        </h4>
      </div>
      <p class="text-xs text-muted-foreground">
        Customize how data tables look across Quick Query, raw query, and all
        table views. Changes apply immediately.
      </p>
    </div>

    <!-- Live preview -->
    <div class="space-y-2">
      <p class="text-sm font-medium">Preview</p>
      <TableAppearancePreview
        :font-size="configs.fontSize"
        :row-height="configs.rowHeight"
        :accent-color="previewAccentColor"
        :header-font-size="configs.headerFontSize"
        :header-font-weight="configs.headerFontWeight"
        :header-background-color="previewHeaderBg"
      />
    </div>

    <!-- ── Header section ────────────────────────────── -->
    <div class="space-y-3">
      <p class="text-sm font-medium">Header table</p>

      <!-- Header Font Size + Font Weight (inline) -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground font-medium">Font size</p>
          <Select
            :model-value="String(configs.headerFontSize)"
            @update:model-value="
              v =>
                (appConfigStore.tableAppearanceConfigs.headerFontSize =
                  Number(v))
            "
          >
            <SelectTrigger size="sm" class="h-7! w-full cursor-pointer text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in TABLE_HEADER_FONT_SIZE_OPTIONS"
                :key="opt.value"
                :value="String(opt.value)"
                class="text-xs"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground font-medium">Font weight</p>
          <Select
            :model-value="String(configs.headerFontWeight)"
            @update:model-value="
              v =>
                (appConfigStore.tableAppearanceConfigs.headerFontWeight =
                  Number(v))
            "
          >
            <SelectTrigger size="sm" class="h-7! w-full cursor-pointer text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in HEADER_FONT_WEIGHT_OPTIONS"
                :key="opt.value"
                :value="String(opt.value)"
                class="text-xs"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Header Background Color -->
      <div class="space-y-1.5">
        <p class="text-xs text-muted-foreground font-medium">Background</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <input
              type="color"
              :value="configs.headerBackgroundColorLight || '#f4f4f5'"
              @input="
                e =>
                  (appConfigStore.tableAppearanceConfigs.headerBackgroundColorLight =
                    (e.target as HTMLInputElement).value)
              "
            />
            <div class="flex flex-col gap-0.5">
              <p class="text-xs font-medium">Light</p>
              <p class="text-xs text-muted-foreground font-mono">
                {{ configs.headerBackgroundColorLight || 'default' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <input
              type="color"
              :value="configs.headerBackgroundColorDark || '#27272a'"
              @input="
                e =>
                  (appConfigStore.tableAppearanceConfigs.headerBackgroundColorDark =
                    (e.target as HTMLInputElement).value)
              "
            />
            <div class="flex flex-col gap-0.5">
              <p class="text-xs font-medium">Dark</p>
              <p class="text-xs text-muted-foreground font-mono">
                {{ configs.headerBackgroundColorDark || 'default' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Row section ───────────────────────────────── -->
    <div class="space-y-3">
      <p class="text-sm font-medium">Row</p>

      <!-- Row Font Size + Spacing (inline) -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground font-medium">Font size</p>
          <Select
            :model-value="String(configs.fontSize)"
            @update:model-value="
              v => (appConfigStore.tableAppearanceConfigs.fontSize = Number(v))
            "
          >
            <SelectTrigger size="sm" class="h-7! w-full cursor-pointer text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in TABLE_FONT_SIZE_OPTIONS"
                :key="opt.value"
                :value="String(opt.value)"
                class="text-xs"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground font-medium">Spacing</p>
          <Input
            type="number"
            :min="1"
            :step="0.1"
            :model-value="configs.cellSpacing"
            @update:model-value="
              v =>
                (appConfigStore.tableAppearanceConfigs.cellSpacing = Number(v))
            "
            class="h-7 w-full text-xs text-right"
          />
        </div>
      </div>

      <!-- Row Height -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm">Row height</p>
            <p class="text-xs text-muted-foreground">
              Control the density of table rows
            </p>
          </div>
          <span class="text-sm font-mono tabular-nums w-10 text-right">
            {{ configs.rowHeight }}px
          </span>
        </div>
        <Slider
          :min="TABLE_ROW_HEIGHT_RANGE.min"
          :max="TABLE_ROW_HEIGHT_RANGE.max"
          :step="TABLE_ROW_HEIGHT_RANGE.step"
          :model-value="[configs.rowHeight]"
          @update:model-value="
            v => {
              if (v) appConfigStore.tableAppearanceConfigs.rowHeight = v[0];
            }
          "
          class="w-full"
        />
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>{{ TABLE_ROW_HEIGHT_RANGE.min }}px</span>
          <span>{{ TABLE_ROW_HEIGHT_RANGE.max }}px</span>
        </div>
      </div>

      <!-- Accent Color -->
      <div class="space-y-2">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Accent color</p>
          <p class="text-xs text-muted-foreground">
            Color used for row selection highlights and focus borders.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <input
              type="color"
              :value="configs.accentColorLight"
              @input="
                e =>
                  (appConfigStore.tableAppearanceConfigs.accentColorLight = (
                    e.target as HTMLInputElement
                  ).value)
              "
            />
            <div class="flex flex-col gap-0.5">
              <p class="text-xs font-medium">Light</p>
              <p class="text-xs text-muted-foreground font-mono">
                {{ configs.accentColorLight }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <input
              type="color"
              :value="configs.accentColorDark"
              @input="
                e =>
                  (appConfigStore.tableAppearanceConfigs.accentColorDark = (
                    e.target as HTMLInputElement
                  ).value)
              "
            />
            <div class="flex flex-col gap-0.5">
              <p class="text-xs font-medium">Dark</p>
              <p class="text-xs text-muted-foreground font-mono">
                {{ configs.accentColorDark }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          @click="appConfigStore.resetTableAppearance()"
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type='color' i] {
  border-radius: 50%;
  height: 2rem;
  width: 2rem;
  outline: none;
  border-width: 1px;
  border-style: solid;
  border-color: var(--ring);
  -webkit-appearance: none;
}

input[type='color' i]::-webkit-color-swatch-wrapper {
  padding: 2px;
}
input[type='color' i]::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}
</style>
