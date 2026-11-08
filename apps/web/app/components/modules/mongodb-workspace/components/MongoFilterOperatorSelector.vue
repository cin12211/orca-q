<script setup lang="ts">
import { computed } from 'vue';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import type { MongoFilterOperator } from '../types';
import {
  mongoOperatorSeparatorRow,
  MONGO_FILTER_OPERATOR_GROUPS,
} from '../utils/mongoFilterUtils';

const props = defineProps<{
  value?: MongoFilterOperator;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: MongoFilterOperator): void;
  (e: 'update:open', open: boolean): void;
}>();

const selectedOperator = computed({
  get: () => props.value || '$eq',
  set: val => {
    if (val) emit('update:value', val as MongoFilterOperator);
  },
});
</script>

<template>
  <Select
    size="xxs"
    v-model="selectedOperator"
    @update:open="isOpen => emit('update:open', isOpen)"
  >
    <SelectTrigger class="w-36 min-w-36 cursor-pointer">
      <SelectValue placeholder="Select operator" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <template
          v-for="(op, index) in MONGO_FILTER_OPERATOR_GROUPS"
          :key="index"
        >
          <SelectSeparator
            v-if="op.value === mongoOperatorSeparatorRow.value"
          />
          <SelectItem v-else :value="op.value" class="cursor-pointer">
            {{ op.label }}
          </SelectItem>
        </template>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
