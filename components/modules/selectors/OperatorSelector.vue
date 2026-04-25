<script setup lang="ts">
import { SelectSeparator } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { separatorRow, operatorSets } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const props = defineProps<{ dbType: DatabaseClientType; value?: string }>();

defineEmits<{
  (e: 'update:value', value: AcceptableValue): void;
  (e: 'update:open', value: boolean): void;
}>();

// Fall back to MySQL operator set when the dbType has no dedicated entry
// (e.g. an unseen DB type added in future) to avoid rendering an empty list.
const operators = computed(
  () =>
    operatorSets[props.dbType] ?? operatorSets[DatabaseClientType.MYSQL] ?? []
);
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
