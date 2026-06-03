<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#components';
import { CHART_TYPE_CATEGORIES } from '../constants';
import { ChartType } from '../types';

const modelValue = defineModel<ChartType>({ required: true });
</script>

<template>
  <Select v-model="modelValue" size="xs">
    <SelectTrigger class="w-full cursor-pointer">
      <SelectValue placeholder="Select Chart Type" />
    </SelectTrigger>
    <SelectContent class="max-h-72">
      <SelectGroup v-for="group in CHART_TYPE_CATEGORIES" :key="group.category">
        <SelectLabel
          class="text-[10px] uppercase tracking-wider text-muted-foreground/60"
        >
          {{ group.label }}
        </SelectLabel>
        <SelectItem
          v-for="chartMeta in group.types"
          :key="chartMeta.value"
          :value="chartMeta.value"
          class="cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <Icon :name="chartMeta.icon" class="size-3.5" />
            <span>{{ chartMeta.label }}</span>
            <span class="text-[10px] text-muted-foreground/50 ml-auto">
              {{ chartMeta.description }}
            </span>
          </div>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
