<script setup lang="ts">
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '#components';

const activeTab = ref('rules');

interface WorkspaceFile {
  name: string;
  path: string;
}

const rules = ref<WorkspaceFile[]>([]);
const instructions = ref<WorkspaceFile[]>([]);
const skills = ref<WorkspaceFile[]>([]);

const tabItems = [
  { value: 'rules', label: 'Rules', icon: 'hugeicons:shield-check' },
  {
    value: 'instructions',
    label: 'Instructions',
    icon: 'hugeicons:book-open-01',
  },
  { value: 'skills', label: 'Skills', icon: 'hugeicons:magic-wand-03' },
];

const currentFiles = computed(() => {
  switch (activeTab.value) {
    case 'rules':
      return rules.value;
    case 'instructions':
      return instructions.value;
    case 'skills':
      return skills.value;
    default:
      return [];
  }
});

const currentDescription = computed(() => {
  switch (activeTab.value) {
    case 'rules':
      return 'Rules are injected into every agent request. Define naming conventions, query safety rules, and output format preferences.';
    case 'instructions':
      return 'Instructions provide context for specific tables or schemas. Help the agent understand business logic.';
    case 'skills':
      return 'Skills are reusable workflows the agent can trigger. Define multi-step query patterns and reports.';
    default:
      return '';
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <Tabs v-model="activeTab" class="flex flex-col flex-1 overflow-hidden">
      <TabsList class="w-full justify-start rounded-none border-b px-2 h-8">
        <TabsTrigger
          v-for="tab in tabItems"
          :key="tab.value"
          :value="tab.value"
          class="text-xs px-2 py-1 h-6"
        >
          <Icon :name="tab.icon" class="size-3 mr-1" />
          {{ tab.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        :value="activeTab"
        class="flex-1 overflow-y-auto px-2 py-2 mt-0"
      >
        <!-- Description -->
        <p class="text-xs text-muted-foreground mb-3">
          {{ currentDescription }}
        </p>

        <!-- Empty state -->
        <div
          v-if="currentFiles.length === 0"
          class="text-center py-8 text-muted-foreground"
        >
          <Icon
            name="hugeicons:folder-open"
            class="size-8 mb-2 opacity-40 mx-auto"
          />
          <p class="text-xs">No {{ activeTab }} configured yet</p>
          <p class="text-[11px] mt-1 opacity-70">
            Create <code>.db-agent/{{ activeTab }}/</code> files in your project
          </p>
        </div>

        <!-- File list -->
        <div v-else class="space-y-1">
          <div
            v-for="file in currentFiles"
            :key="file.path"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs"
          >
            <Icon
              name="hugeicons:file-02"
              class="size-3.5 text-muted-foreground"
            />
            <span class="truncate">{{ file.name }}</span>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
