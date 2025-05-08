<script setup lang="ts">
import { format } from 'sql-formatter';

defineProps<{ currentFilter: string; allFilter: string }>();

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
    <div class="text-xs flex items-center gap-4">
      <div><ContextMenuShortcut>⌘F</ContextMenuShortcut>: Show</div>
      <div><ContextMenuShortcut>⌘I</ContextMenuShortcut>: Insert</div>
      <div><ContextMenuShortcut>⌘⌫</ContextMenuShortcut>: Delete</div>
      <div><ContextMenuShortcut>⌘↵</ContextMenuShortcut>: Apply all</div>
      <div><ContextMenuShortcut>Esc</ContextMenuShortcut>: Exit</div>
    </div>
    <div>
      <Popover>
        <PopoverTrigger>
          <Button size="sm" class="h-6 text-xs" variant="outline"> SQL </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[40rem] p-2 space-y-2">
          <div class="text-xs font-medium">
            Curren filter
            <Textarea
              class="text-xs! mt-1 h-full max-h-[15rem] font-normal"
              :model-value="
                format(currentFilter, {
                  language: 'postgresql',
                  keywordCase: 'upper',
                })
              "
              readonly
            />
          </div>

          <div class="text-xs font-medium">
            Apply all filter
            <Textarea
              class="text-xs! mt-1 h-full max-h-[15rem] font-normal"
              :model-value="
                format(allFilter, {
                  language: 'postgresql',
                  keywordCase: 'upper',
                })
              "
              readonly
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>
