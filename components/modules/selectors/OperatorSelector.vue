<script setup lang="ts">
import { SelectSeparator } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { separatorRow, operatorSets } from '~/core/constants';
import { EDatabaseType } from '../management-connection/constants';

const props = defineProps<{ dbType: EDatabaseType; value?: string }>();

defineEmits<{
  (e: 'update:value', value: AcceptableValue): void;
  (e: 'update:open', value: boolean): void;
}>();

const operators = computed(() => operatorSets[props.dbType]);
</script>

<template>
  <Select
    :model-value="value"
    @update:model-value="$emit('update:value', $event)"
    @update:open="$emit('update:open', $event)"
  >
    <SelectTrigger class="w-36 min-w-36 h-6! text-sm cursor-pointer px-2">
      <SelectValue placeholder="Select operator" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <!-- <SelectLabel>Fruits</SelectLabel> -->

        <template v-for="operator in operators">
          <SelectSeparator v-if="operator.value === separatorRow.value" />

          <SelectItem
            class="h-6 text-sm cursor-pointer"
            :value="operator.value"
            v-else
          >
            {{ operator.label }}
          </SelectItem>
        </template>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
