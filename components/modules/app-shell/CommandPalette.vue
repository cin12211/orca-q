<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '#components';
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useCommandEngine } from '~/core/command-engine/useCommandEngine';
import { useCommandPalette } from '~/core/contexts/useCommandPalette';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import { useExplorerFileStore } from '~/core/stores/useExplorerFileStore';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/core/types';
import CommandPaletteInput from './CommandPaletteInput.vue';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const { isCommandPaletteOpen } = useCommandPalette();

// Command Engine — prefix detection
const { searchInput, groupedResults, activePrefix, placeholder, resetSearch } =
  useCommandEngine();

useHotkeys(
  [
    {
      key: 'meta+k',
      callback: async () => {
        isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
      },
      isPreventDefault: true,
    },
    {
      key: 'meta+p',
      callback: () => {
        isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
      },
      isPreventDefault: true,
    },
  ],
  {}
);

// Reset search when dialog closes
watch(isCommandPaletteOpen, open => {
  if (!open) resetSearch();
});

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------
const explorerFileStore = useExplorerFileStore();
const schemaStore = useSchemaStore();
const settingsModal = useSettingsModal();
const tabViewsStore = useTabViewsStore();
const route = useRoute('workspaceId-connectionId');

const connectionId = computed(
  () => route.params.connectionId as string | undefined
);
const workspaceId = computed(
  () => route.params.workspaceId as string | undefined
);

// ---------------------------------------------------------------------------
// Prefix mode detection
// ---------------------------------------------------------------------------
const isPrefixMode = computed(() => !!activePrefix.value);

// ---------------------------------------------------------------------------
// Searchable lists — icons & colors match useSchemaTreeData.ts exactly
// (used in default mode, when no prefix is active)
// ---------------------------------------------------------------------------

/** Open tabs excluding active ("Open Recent") */
const recentTabs = computed(() => {
  const activeId = tabViewsStore.activeTab?.id;
  return tabViewsStore.tabViews.filter(tab => tab.id !== activeId);
});

/** Explorer files (non-folder only) */
const files = computed(() => {
  return explorerFileStore.flatNodes.filter(node => !node.isFolder);
});

/** Schema tables — icon: hugeicons:grid-table, color: text-yellow-400 */
const tables = computed(() => {
  return schemaStore.schemasByContext.flatMap(s =>
    s.tables.map(tableName => ({
      name: tableName,
      schemaId: s.name,
      type: TabViewType.TableDetail,
      icon: 'hugeicons:grid-table',
      iconClass: 'text-yellow-400',
    }))
  );
});

/**
 * Schema views
 *   VIEW             → hugeicons:property-view  + text-green-700
 *   MATERIALIZED_VIEW → hugeicons:property-new   + text-orange-500
 */
const views = computed(() => {
  return schemaStore.schemasByContext.flatMap(s =>
    s.views.map(view => ({
      name: view.name,
      schemaId: s.name,
      type: TabViewType.ViewDetail,
      virtualTableId: view.oid,
      icon:
        view.type === ViewSchemaEnum.View
          ? 'hugeicons:property-view'
          : 'hugeicons:property-new',
      iconClass:
        view.type === ViewSchemaEnum.View
          ? 'text-green-700'
          : 'text-orange-500',
    }))
  );
});

/**
 * Schema functions
 *   FUNCTION  → gravity-ui:function + text-blue-400
 *   PROCEDURE → gravity-ui:function + text-orange-400
 */
const functions = computed(() => {
  return schemaStore.schemasByContext.flatMap(s =>
    s.functions.map(func => ({
      name: func.name,
      schemaId: s.name,
      type: TabViewType.FunctionsDetail,
      functionId: func.oId,
      icon: 'gravity-ui:function',
      iconClass:
        func.type === FunctionSchemaEnum.Function
          ? 'text-blue-400'
          : 'text-orange-400',
    }))
  );
});

/** Settings tabs — icons from Settings.vue */
const settingsTabs = [
  { name: 'Editor', icon: 'lucide:scroll-text' },
  { name: 'Quick Query', icon: 'lucide:table-2' },
  { name: 'Agent', icon: 'hugeicons:chat-bot' },
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const handleSelectFile = async (file: (typeof files.value)[number]) => {
  isCommandPaletteOpen.value = false;
  if (!connectionId.value || !workspaceId.value) return;

  await tabViewsStore.openTab({
    id: file.id,
    name: file.title,
    icon: file.icon || 'lucide:file',
    type: TabViewType.CodeQuery,
    routeName: 'workspaceId-connectionId-explorer-fileId',
    routeParams: { fileId: file.id },
    connectionId: connectionId.value,
    schemaId: '',
    workspaceId: workspaceId.value,
    metadata: {
      type: TabViewType.CodeQuery,
      tableName: file.title,
      treeNodeId: file.id,
    },
  });
  await tabViewsStore.selectTab(file.id);
};

const handleSelectSchemaItem = async (item: {
  name: string;
  schemaId: string;
  type: TabViewType;
  icon: string;
  iconClass?: string;
  virtualTableId?: string;
  functionId?: string;
}) => {
  isCommandPaletteOpen.value = false;
  if (!connectionId.value || !workspaceId.value) return;

  const tabId = `${item.name}-${item.schemaId}`;

  await tabViewsStore.openTab({
    id: tabId,
    name: item.name,
    icon: item.icon,
    iconClass: item.iconClass,
    type: item.type,
    routeName: 'workspaceId-connectionId-quick-query-tabViewId',
    routeParams: { tabViewId: tabId },
    connectionId: connectionId.value,
    schemaId: item.schemaId,
    workspaceId: workspaceId.value,
    metadata: {
      type: item.type,
      tableName: item.name,
      virtualTableId: item.virtualTableId,
      functionId: item.functionId,
    },
  });
  await tabViewsStore.selectTab(tabId);
};

const handleSelectSettings = (tabName: string) => {
  isCommandPaletteOpen.value = false;
  settingsModal.openSettings(tabName);
};

const handleSelectRecentTab = async (
  tab: (typeof recentTabs.value)[number]
) => {
  isCommandPaletteOpen.value = false;
  await tabViewsStore.selectTab(tab.id);
};

/** Execute a command from the engine (prefix mode) */
const handleSelectCommand = (item: { execute: () => void | Promise<void> }) => {
  isCommandPaletteOpen.value = false;
  item.execute();
};
</script>

<template>
  <CommandDialog v-model:open="isCommandPaletteOpen">
    <!-- Single input that syncs both filterState and searchInput -->
    <CommandPaletteInput
      v-model:search-input="searchInput"
      :active-prefix="activePrefix"
      :placeholder="placeholder"
    />

    <CommandList>
      <!-- ============================================================ -->
      <!-- PREFIX MODE: render dynamic results from the command engine   -->
      <!-- ============================================================ -->
      <template v-if="isPrefixMode">
        <template v-if="[...groupedResults.values()].flat().length === 0">
          <CommandEmpty>
            <div class="py-4 px-4 space-y-3">
              <p class="text-sm text-muted-foreground text-center">
                No results found. Try a different prefix:
              </p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div
                  class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
                >
                  <Kbd class="text-xs">t:</Kbd>
                  <span class="text-muted-foreground">Search tables</span>
                </div>
                <div
                  class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
                >
                  <Kbd class="text-xs">v:</Kbd>
                  <span class="text-muted-foreground">Search views</span>
                </div>
                <div
                  class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
                >
                  <Kbd class="text-xs">f:</Kbd>
                  <span class="text-muted-foreground">Search functions</span>
                </div>
                <div
                  class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
                >
                  <Kbd class="text-xs">tab:</Kbd>
                  <span class="text-muted-foreground">Switch tabs</span>
                </div>
                <div
                  class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
                >
                  <Kbd class="text-xs">erd:</Kbd>
                  <span class="text-muted-foreground">Open ERD</span>
                </div>
                <div
                  class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
                >
                  <Kbd class="text-xs">></Kbd>
                  <span class="text-muted-foreground">Run commands</span>
                </div>
              </div>
            </div>
          </CommandEmpty>
        </template>

        <template v-for="[groupName, items] in groupedResults" :key="groupName">
          <CommandGroup :heading="groupName">
            <CommandItem
              v-for="item in items"
              :key="item.id"
              :value="item.label"
              class="cursor-pointer hover:bg-accent"
              @select="() => handleSelectCommand(item)"
            >
              <Icon :name="item.icon" :class="['size-4', item.iconClass]" />
              <span>{{ item.label }}</span>
              <span
                v-if="item.description"
                class="ml-auto text-xs text-muted-foreground"
              >
                {{ item.description }}
              </span>
            </CommandItem>
          </CommandGroup>
        </template>
      </template>

      <!-- ============================================================ -->
      <!-- DEFAULT MODE: original grouped layout (no prefix)            -->
      <!-- ============================================================ -->
      <template v-else>
        <CommandEmpty>
          <div class="py-4 px-4 space-y-3">
            <p class="text-sm text-muted-foreground text-center">
              No results found. Try a prefix to narrow your search:
            </p>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div
                class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
              >
                <Kbd class="text-xs">t:</Kbd>
                <span class="text-muted-foreground">Search tables</span>
              </div>
              <div
                class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
              >
                <Kbd class="text-xs">v:</Kbd>
                <span class="text-muted-foreground">Search views</span>
              </div>
              <div
                class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
              >
                <Kbd class="text-xs">f:</Kbd>
                <span class="text-muted-foreground">Search functions</span>
              </div>
              <div
                class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
              >
                <Kbd class="text-xs">tab:</Kbd>
                <span class="text-muted-foreground">Switch tabs</span>
              </div>
              <div
                class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
              >
                <Kbd class="text-xs">erd:</Kbd>
                <span class="text-muted-foreground">Open ERD</span>
              </div>
              <div
                class="flex items-center gap-2 rounded-md bg-accent/30 px-2.5 py-1.5"
              >
                <Kbd class="text-xs">></Kbd>
                <span class="text-muted-foreground">Run commands</span>
              </div>
            </div>
          </div>
        </CommandEmpty>

        <!-- Open Recent -->
        <CommandGroup heading="Open Recent" v-if="recentTabs.length > 0">
          <CommandItem
            v-for="tab in recentTabs"
            :key="tab.id"
            :value="`recent ${tab.name}`"
            class="cursor-pointer hover:bg-accent"
            @select="() => handleSelectRecentTab(tab)"
          >
            <Icon
              :name="tab.icon || 'lucide:file'"
              :class="['size-4', tab.iconClass]"
            />
            <span>{{ tab.name }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator v-if="recentTabs.length > 0 && files.length > 0" />

        <!-- Files -->
        <CommandGroup heading="Files" v-if="files.length > 0">
          <CommandItem
            v-for="file in files"
            :key="file.id"
            :value="`file ${file.title}`"
            class="cursor-pointer hover:bg-accent"
            @select="() => handleSelectFile(file)"
          >
            <Icon
              :name="file.icon || 'hugeicons:document-code'"
              class="size-4"
            />
            <span>{{ file.title }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator v-if="files.length > 0 && tables.length > 0" />

        <!-- Tables -->
        <CommandGroup heading="Tables" v-if="tables.length > 0">
          <CommandItem
            v-for="table in tables"
            :key="`${table.schemaId}-${table.name}`"
            :value="`table ${table.name}`"
            class="cursor-pointer hover:bg-accent"
            @select="() => handleSelectSchemaItem(table)"
          >
            <Icon :name="table.icon" :class="['size-4', table.iconClass]" />
            <span>
              {{ table.name }}
              <span class="text-xs text-muted-foreground ml-1">{{
                table.schemaId
              }}</span>
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator v-if="tables.length > 0 && views.length > 0" />

        <!-- Views -->
        <CommandGroup heading="Views" v-if="views.length > 0">
          <CommandItem
            v-for="view in views"
            :key="`${view.schemaId}-${view.name}`"
            :value="`view ${view.name}`"
            class="cursor-pointer hover:bg-accent"
            @select="() => handleSelectSchemaItem(view)"
          >
            <Icon :name="view.icon" :class="['size-4', view.iconClass]" />
            <span>
              {{ view.name }}
              <span class="text-xs text-muted-foreground ml-1">{{
                view.schemaId
              }}</span>
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator v-if="views.length > 0 && functions.length > 0" />

        <!-- Functions -->
        <CommandGroup heading="Functions" v-if="functions.length > 0">
          <CommandItem
            v-for="func in functions"
            :key="`${func.schemaId}-${func.name}`"
            :value="`function ${func.name}`"
            class="cursor-pointer hover:bg-accent"
            @select="() => handleSelectSchemaItem(func)"
          >
            <Icon :name="func.icon" :class="['size-4', func.iconClass]" />
            <span>
              {{ func.name }}
              <span class="text-xs text-muted-foreground ml-1">{{
                func.schemaId
              }}</span>
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <!-- Settings -->
        <CommandGroup heading="Settings">
          <CommandItem
            v-for="tab in settingsTabs"
            :key="tab.name"
            :value="`settings ${tab.name}`"
            class="cursor-pointer hover:bg-accent"
            @select="() => handleSelectSettings(tab.name)"
          >
            <Icon :name="tab.icon" class="size-4" />
            <span>{{ tab.name }} Settings</span>
          </CommandItem>
        </CommandGroup>
      </template>
    </CommandList>

    <!-- Footer hints -->
    <div
      class="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground"
    >
      <div class="flex items-center gap-3">
        <span><Kbd class="text-[10px]">↑↓</Kbd> Navigate</span>
        <span><Kbd class="text-[10px]">↵</Kbd> Select</span>
        <span><Kbd class="text-[10px]">Esc</Kbd> Close</span>
      </div>

      <div class="w-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="iconSm" variant="ghost">
                <Icon name="hugeicons:help-circle" class="w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" class="w-56 p-2">
              <p class="text-xs font-medium mb-1.5">Prefix shortcuts</p>
              <div class="grid grid-cols-2 gap-1.5 text-[11px]">
                <div class="flex items-center gap-1.5">
                  <Kbd class="text-[10px]">t:</Kbd>
                  <span>Tables</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Kbd class="text-[10px]">v:</Kbd>
                  <span>Views</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Kbd class="text-[10px]">f:</Kbd>
                  <span>Functions</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Kbd class="text-[10px]">tab:</Kbd>
                  <span>Tabs</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Kbd class="text-[10px]">erd:</Kbd>
                  <span>ERD</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Kbd class="text-[10px]">></Kbd>
                  <span>Commands</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  </CommandDialog>
</template>
