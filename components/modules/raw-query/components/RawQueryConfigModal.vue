<script setup lang="ts">
import { Switch } from '#components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DEFAULT_EDITOR_CONFIG,
  EDITOR_FONT_SIZES,
  EditorTheme,
  EditorThemeDark,
  EditorThemeLight,
} from '~/components/base/code-editor/constants';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import { RawQueryEditorLayout } from '../constants';

defineProps<{
  open: Boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const appLayoutStore = useAppLayoutStore();
</script>
<template>
  <Dialog class="" :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="w-[40vw] h-[50vh] flex flex-col justify-between min-w-[40vw]"
    >
      <DialogHeader>
        <DialogTitle> Editor configs </DialogTitle>
      </DialogHeader>

      <div class="h-full flex flex-col overflow-y-auto gap-2">
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
                  'ring ring-primary':
                    appLayoutStore.codeEditorLayout ===
                    RawQueryEditorLayout.vertical,
                  'hover:ring':
                    appLayoutStore.codeEditorLayout !==
                    RawQueryEditorLayout.vertical,
                }"
                @click="
                  appLayoutStore.setCodeEditorLayout(
                    RawQueryEditorLayout.vertical
                  )
                "
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

                <!-- <div
                  class="col-span-6 row-span-4 border rounded-md bg-accent"
                ></div>
                <div
                  class="col-span-6 row-span-3 border rounded-md bg-accent"
                ></div> -->
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
                  'ring ring-primary':
                    appLayoutStore.codeEditorLayout ===
                    RawQueryEditorLayout.horizontalWithVariables,
                  'hover:ring':
                    appLayoutStore.codeEditorLayout !==
                    RawQueryEditorLayout.horizontalWithVariables,
                }"
                @click="
                  appLayoutStore.setCodeEditorLayout(
                    RawQueryEditorLayout.horizontalWithVariables
                  )
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
                  'ring ring-primary':
                    appLayoutStore.codeEditorLayout ===
                    RawQueryEditorLayout.horizontal,
                  'hover:ring':
                    appLayoutStore.codeEditorLayout !==
                    RawQueryEditorLayout.horizontal,
                }"
                @click="
                  appLayoutStore.setCodeEditorLayout(
                    RawQueryEditorLayout.horizontal
                  )
                "
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

        <div>
          <h4
            class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-1"
          >
            <Icon name="hugeicons:source-code-square" class="size-5!" /> Code
            Editor
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
                        value === DEFAULT_EDITOR_CONFIG.fontSize
                          ? '(default)'
                          : ''
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
                      {{
                        value === DEFAULT_EDITOR_CONFIG.theme ? '(default)' : ''
                      }}
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
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
