<script setup lang="ts">
import { TreeItem, TreeRoot } from "reka-ui";
import { Icon } from "@iconify/vue";
import { Search } from "lucide-vue-next";

const dataBaseNames = await useFetch("/api/get-database-names");
const schemas = await useFetch("/api/get-schemas");
const tables = await useFetch("/api/get-tables");
const functions = await useFetch("/api/get-functions");

const mappedTables =
  tables.data.value?.result?.[0]?.metadata_json_to_import?.tables || [];
const mappedFunctions =
  functions.data.value?.result?.[0]?.functions_metadata || [];

console.log("schemas::", functions.data.value);

const items = [
  {
    title: "Functions",
    icon: "material-icon-theme:folder-functions-open",
    closeIcon: "material-icon-theme:folder-functions",
    children: [
      ...mappedFunctions.map((e) => ({
        title: e.function_name,
        icon: "vscode-icons:file-type-haskell",
      })),
    ],
  },
  {
    title: "Tables",
    icon: "material-icon-theme:folder-database-open",
    closeIcon: "material-icon-theme:folder-database",
    children: [
      ...mappedTables.map((e) => ({
        title: e.table,
        icon: "vscode-icons:file-type-sql",
      })),
    ],
  },
];
</script>

<template>
  <div class="relative w-full items-center px-3 pt-2">
    <div class="relative w-full">
      <!-- <Search class="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /> -->
      <Input
        type="text"
        placeholder="Search in all tables or functions"
        class="pl-2 w-full h-8"
      />
    </div>
  </div>

  <div class="px-3 py-2">
    <p class="text-sm font-medium text-muted-foreground leading-none">
      Schemas
    </p>
  </div>

  <TreeRoot
    v-slot="{ flattenItems }"
    class="list-none h-full select-none px-1 text-sm font-medium"
    :items="items"
    :get-key="(item) => item.title"
  >
    <TreeItem
      v-for="item in flattenItems"
      v-slot="{ isExpanded }"
      :key="item._id"
      :style="{ 'padding-left': `${item.level - 0.5}rem` }"
      v-bind="item.bind"
      class="flex items-center py-1 px-2 my-0.5 cursor-pointer rounded outline-none data-[selected]:bg-accent hover:bg-accent"
    >
      <template v-if="item.hasChildren">
        <Icon
          v-if="!isExpanded"
          :icon="item.value.closeIcon || 'lucide:folder'"
          class="size-4 min-w-4"
        />
        <Icon v-else :icon="item.value.icon" class="size-4 min-w-4" />
      </template>
      <Icon
        v-else
        :icon="item.value.icon || 'lucide:file'"
        class="size-4 min-w-4"
      />
      <div class="pl-1 truncate">
        {{ item.value.title }}
      </div>
    </TreeItem>
  </TreeRoot>
</template>
