<script setup lang="ts">
import { Popover, PopoverTrigger, SelectItem } from '#components';
import type { Input } from '~/components/ui/input';

const props = defineProps<{
  value: string;
  placeholder: string;
  columns: string[];
}>();

const emits = defineEmits<{
  (e: 'update:value', payload: string): void;
}>();

const inputRef = ref<InstanceType<typeof Input>>();

const openAutoComplete = ref(false);

const onUpdateInput = (value: string) => {
  openAutoComplete.value = true;

  emits('update:value', value);
};

// refactor need expose with {} format
defineExpose(inputRef);
</script>

<template>
  <!-- https:www.shadcn-vue.com/docs/components/combobox -->
  <!-- TODO: need to apply auto suggesions for row query, this help user show columns name, only trigger show in the first or near 'and' or 'or' key word -->

  <Popover :open="openAutoComplete">
    {{ columns }}
    <PopoverTrigger as-child>
      <Input
        :model-value="value"
        @update:model-value="onUpdateInput($event as string)"
        type="text"
        :placeholder="placeholder"
        class="w-full h-6 px-2"
        :ref="ref"
      />
    </PopoverTrigger>

    <PopoverContent class="w-[200px] p-0">
      <Command>
        <CommandEmpty>No framework found.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <SelectItem v-for="column in columns" :key="column" :value="column">
              <!-- <Check :class="cn('mr-2 h-4 w-4')" /> -->
              {{ column }}
            </SelectItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
