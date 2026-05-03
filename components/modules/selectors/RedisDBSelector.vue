<script setup lang="ts">
import { Label } from '@/components/ui/label';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';

const props = defineProps<{
  databases: RedisDatabaseOption[];
  databaseIndex: number;
  compact?: boolean;
  label?: string;
  triggerId?: string;
  triggerClass?: string;
}>();

const emit = defineEmits<{
  (e: 'update:databaseIndex', value: number): void;
}>();

const databaseOptions = computed(() => {
  if (props.databases.length > 0) {
    return props.databases;
  }

  return [
    {
      index: props.databaseIndex,
      label: `DB ${props.databaseIndex}`,
      keyCount: 0,
      expires: 0,
      avgTtl: null,
    },
  ];
});

const resolvedTriggerId = computed(() => props.triggerId || 'redis-db-index');

const selectedDatabase = computed(() => {
  return (
    databaseOptions.value.find(
      option => option.index === props.databaseIndex
    ) ?? databaseOptions.value[0]
  );
});

const triggerClassName = computed(() => {
  if (props.compact) {
    return ['h-6! w-fit gap-1 px-2 text-xs', props.triggerClass]
      .filter(Boolean)
      .join(' ');
  }

  return ['w-full', props.triggerClass].filter(Boolean).join(' ');
});
</script>

<template>
  <div :class="compact ? 'w-[132px]' : 'space-y-1'">
    <Label v-if="!compact" :for="resolvedTriggerId">
      {{ label || 'Databases' }}
    </Label>
    <Select
      :model-value="String(databaseIndex)"
      @update:model-value="emit('update:databaseIndex', Number($event) || 0)"
    >
      <SelectTrigger
        :id="resolvedTriggerId"
        size="sm"
        :class="triggerClassName"
      >
        <div class="flex min-w-0 items-center gap-1.5 pr-5 text-left">
          <span :class="compact ? 'truncate text-xs' : 'truncate text-sm'">
            {{ selectedDatabase?.label || 'Select DB' }}
          </span>
          <span
            class="shrink-0 text-muted-foreground"
            :class="compact ? 'text-xxs' : 'text-xxs'"
          >
            {{ selectedDatabase?.keyCount ?? 0 }} keys
          </span>
        </div>
      </SelectTrigger>

      <SelectContent>
        <SelectItem
          v-for="database in databaseOptions"
          :key="database.index"
          :value="String(database.index)"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate">{{ database.label }}</span>
            <span class="text-xxs text-muted-foreground">
              {{ database.keyCount }} keys
            </span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
