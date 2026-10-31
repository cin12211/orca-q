<script setup lang="ts">
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DatabaseFileOptionField } from '~/core/constants/database-file-options';

defineProps<{ field: DatabaseFileOptionField }>();

const value = defineModel<string>();
</script>

<template>
  <div class="space-y-1">
    <Label>{{ field.label }}</Label>
    <Select v-model="value">
      <SelectTrigger
        class="w-full cursor-pointer"
        :data-testid="`create-database-file-${field.key}`"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="choice in field.choices"
          :key="choice.value"
          class="cursor-pointer"
          :data-testid="`create-database-file-${field.key}-${choice.value}`"
          :value="choice.value"
        >
          {{ choice.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <p class="text-xs text-muted-foreground">
      {{ field.description }}
    </p>
  </div>
</template>
