<script setup lang="ts">
import { Separator } from '#components';
import { format } from 'sql-formatter';
import ViewParserFilterApply from './ViewParserFilterApply.vue';

defineProps<{
  getParserApplyFilter: () => string;
  getParserAllFilter: () => string;
}>();

const composeOperator = ref('AND');

//TODO: make configurable
</script>
<template>
  <div class="flex justify-between">
    <div class="flex items-center gap-0.5 text-xs">
      Compose with:
      <Select v-model:model-value="composeOperator">
        <SelectTrigger
          class="w-14 h-5! text-xs cursor-pointer px-1 border-none gap-1 shadow-none"
        >
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem class="h-5 text-xs cursor-pointer" value="AND">
              AND
            </SelectItem>

            <SelectItem class="h-5 text-xs cursor-pointer" value="OR" disabled>
              OR
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
    <div class="text-xs flex items-center gap-2">
      <div><ContextMenuShortcut>⌘F</ContextMenuShortcut>: Show</div>
      <div><ContextMenuShortcut>Esc</ContextMenuShortcut>: Exit</div>
      <Separator orientation="vertical" class="h-3/4!" />
      <div><ContextMenuShortcut>⌘I</ContextMenuShortcut>: Insert</div>
      <div><ContextMenuShortcut>⌘⌫</ContextMenuShortcut>: Delete</div>
      <div><ContextMenuShortcut>⌘↵</ContextMenuShortcut>: Apply all</div>
    </div>
    <div>
      <ViewParserFilterApply
        :getParserApplyFilter="getParserApplyFilter"
        :getParserAllFilter="getParserAllFilter"
      />
    </div>
  </div>
</template>
