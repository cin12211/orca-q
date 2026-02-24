<script setup lang="ts">
import { Switch } from '#components';
import {
  DEFAULT_EDITOR_CONFIG,
  EDITOR_FONT_SIZES,
  EditorTheme,
  EditorThemeDark,
  EditorThemeLight,
} from '~/components/base/code-editor/constants';
import {
  MAX_CUSTOM_LAYOUTS,
  RawQueryEditorLayout,
  type CustomLayoutDefinition,
} from '~/components/modules/raw-query/constants';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';
import { LayoutBuilderDialog, LayoutPreview } from './layout-builder';

const appLayoutStore = useAppLayoutStore();

// --- Custom Layout Dialog ---
const isBuilderOpen = ref(false);
const editingLayout = ref<CustomLayoutDefinition | null>(null);

const openCreateDialog = () => {
  editingLayout.value = null;
  isBuilderOpen.value = true;
};

const openEditDialog = (layout: CustomLayoutDefinition) => {
  editingLayout.value = layout;
  isBuilderOpen.value = true;
};

const onSaveLayout = (layout: CustomLayoutDefinition) => {
  if (editingLayout.value) {
    const success = appLayoutStore.updateCustomLayout(layout.id, {
      name: layout.name,
      direction: layout.direction,
      panels: layout.panels,
      innerSplit: layout.innerSplit,
    });

    if (!success) return;
  } else {
    const success = appLayoutStore.addCustomLayout(layout);
    if (!success) return;
  }

  // Auto-apply the saved layout
  appLayoutStore.applyCustomLayout(layout.id);
};

const onDeleteLayout = (id: string) => {
  appLayoutStore.deleteCustomLayout(id);
};

const isPresetActive = (preset: RawQueryEditorLayout): boolean => {
  return (
    !appLayoutStore.isUsingCustomLayout &&
    appLayoutStore.codeEditorLayout === preset
  );
};

const onSelectPreset = (preset: RawQueryEditorLayout) => {
  appLayoutStore.applyPresetLayout(preset);
};

const canAddLayout = computed(
  () => appLayoutStore.customLayouts.length < MAX_CUSTOM_LAYOUTS
);
</script>
<template>
  <div class="h-full flex flex-col overflow-y-auto gap-2">
    <!-- Preset Layouts -->
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:layout-01" class="size-5!" /> Dynamic Layouts
      </h4>

      <div class="flex items-center gap-4 px-1">
        <!-- Vertical -->
        <div class="w-1/3">
          <p class="text-xs mb-0.5 text-accent-foreground">
            Vertical (Default)
          </p>
          <div
            class="grid grid-cols-5 grid-rows-5 cursor-pointer gap-2 h-36 border p-2 rounded-md"
            :class="{
              'ring ring-primary': isPresetActive(
                RawQueryEditorLayout.vertical
              ),
              'hover:ring': !isPresetActive(RawQueryEditorLayout.vertical),
            }"
            @click="onSelectPreset(RawQueryEditorLayout.vertical)"
          >
            <div
              className="col-span-4 row-span-3 border rounded-md bg-accent"
            ></div>
            <div
              className="col-span-5 row-span-2 col-start-1 row-start-4 border rounded-md bg-accent"
            ></div>
            <div
              className="row-span-3 col-start-5 row-start-1 border rounded-md bg-accent"
            ></div>
          </div>
        </div>

        <!-- Horizontal with Variables -->
        <div class="w-1/3">
          <p class="text-xs mb-0.5 text-accent-foreground">
            Horizontal with variables
          </p>
          <div
            class="grid grid-cols-5 grid-rows-6 cursor-pointer gap-2 h-36 border p-2 rounded-md"
            :class="{
              'ring ring-primary': isPresetActive(
                RawQueryEditorLayout.horizontalWithVariables
              ),
              'hover:ring': !isPresetActive(
                RawQueryEditorLayout.horizontalWithVariables
              ),
            }"
            @click="
              onSelectPreset(RawQueryEditorLayout.horizontalWithVariables)
            "
          >
            <div
              class="col-span-3 row-span-4 border rounded-md bg-accent"
            ></div>
            <div
              class="col-span-2 row-span-6 col-start-4 border rounded-md bg-accent"
            ></div>
            <div
              class="col-span-3 row-span-2 row-start-5 border rounded-md bg-accent"
            ></div>
          </div>
        </div>

        <!-- Horizontal -->
        <div class="w-1/3">
          <p class="text-xs mb-0.5 text-accent-foreground">Horizontal</p>
          <div
            class="grid grid-cols-6 grid-rows-6 cursor-pointer gap-2 h-36 border p-2 rounded-md"
            :class="{
              'ring ring-primary': isPresetActive(
                RawQueryEditorLayout.horizontal
              ),
              'hover:ring': !isPresetActive(RawQueryEditorLayout.horizontal),
            }"
            @click="onSelectPreset(RawQueryEditorLayout.horizontal)"
          >
            <div
              class="col-span-3 row-span-6 border rounded-md bg-accent"
            ></div>
            <div
              class="col-span-3 row-span-6 col-start-4 border rounded-md bg-accent"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Layouts -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4
          class="text-sm font-medium leading-7 text-primary flex items-center gap-1"
        >
          <Icon name="hugeicons:layout-03" class="size-5!" /> Custom Layouts
        </h4>
        <Button
          size="xs"
          variant="outline"
          :disabled="!canAddLayout"
          @click="openCreateDialog"
          class="cursor-pointer"
        >
          <Icon name="hugeicons:add-01" class="size-3.5! mr-1" />
          Add Layout
        </Button>
      </div>

      <div
        v-if="appLayoutStore.customLayouts.length === 0"
        class="text-sm text-muted-foreground px-1 py-3 text-center border border-dashed rounded-md"
      >
        No custom layouts yet. Click "Add Layout" to create one.
      </div>

      <div v-else class="grid grid-cols-3 gap-3 px-1">
        <div
          v-for="layout in appLayoutStore.customLayouts"
          :key="layout.id"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center justify-between">
            <p class="text-xs text-accent-foreground truncate flex-1">
              {{ layout.name }}
            </p>
            <div class="flex items-center gap-0.5">
              <Button
                size="xs"
                variant="ghost"
                @click.stop="openEditDialog(layout)"
                class="cursor-pointer h-5 w-5 p-0"
              >
                <Icon name="hugeicons:edit-02" class="size-3!" />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                @click.stop="onDeleteLayout(layout.id)"
                class="cursor-pointer h-5 w-5 p-0"
              >
                <Icon name="hugeicons:delete-02" class="size-3!" />
              </Button>
            </div>
          </div>
          <div @click="appLayoutStore.applyCustomLayout(layout.id)">
            <LayoutPreview
              :layout="layout"
              :isActive="
                appLayoutStore.isUsingCustomLayout &&
                appLayoutStore.activeCustomLayoutId === layout.id
              "
              class="h-36"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Code Editor Settings -->
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-1"
      >
        <Icon name="hugeicons:source-code-square" class="size-5!" /> Code Editor
      </h4>
      <div class="flex flex-col space-y-1">
        <div class="flex items-center justify-between">
          <p class="text-sm">Font size</p>
          <Select
            @update:modelValue="
              appLayoutStore.codeEditorConfigs.fontSize = $event as number
            "
            :modelValue="appLayoutStore.codeEditorConfigs.fontSize"
          >
            <SelectTrigger size="sm" class="h-6! cursor-pointer">
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  class="cursor-pointer h-6!"
                  v-for="value in EDITOR_FONT_SIZES"
                  :value="value"
                >
                  {{ value }} pt
                  {{
                    value === DEFAULT_EDITOR_CONFIG.fontSize ? '(default)' : ''
                  }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between">
          <p class="text-sm">Theme</p>
          <Select
            @update:modelValue="
              appLayoutStore.codeEditorConfigs.theme = $event as EditorTheme
            "
            :modelValue="appLayoutStore.codeEditorConfigs.theme"
          >
            <SelectTrigger size="sm" class="h-6! cursor-pointer">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Light Theme</SelectLabel>
                <SelectItem
                  class="cursor-pointer h-6!"
                  v-for="value in EditorThemeLight"
                  :value="value"
                >
                  {{ value }}
                  {{ value === DEFAULT_EDITOR_CONFIG.theme ? '(default)' : '' }}
                </SelectItem>

                <SelectLabel>Dark Theme</SelectLabel>
                <SelectItem
                  class="cursor-pointer h-6!"
                  v-for="value in EditorThemeDark"
                  :value="value"
                >
                  {{ value }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-sm">Mini map</p>
          <div class="flex items-center space-x-2">
            <Switch
              v-model="appLayoutStore.codeEditorConfigs.showMiniMap"
              @update:modelValue="
                appLayoutStore.codeEditorConfigs.showMiniMap = $event
              "
              id="airplane-mode"
              class="cursor-pointer"
            />
          </div>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-sm">Indentation</p>
          <div class="flex items-center space-x-2">
            <Switch
              v-model="appLayoutStore.codeEditorConfigs.indentation"
              @update:modelValue="
                appLayoutStore.codeEditorConfigs.indentation = $event
              "
              id="airplane-mode"
              class="cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Layout Builder Dialog -->
    <LayoutBuilderDialog
      :open="isBuilderOpen"
      :editLayout="editingLayout"
      @update:open="isBuilderOpen = $event"
      @save="onSaveLayout"
    />
  </div>
</template>
