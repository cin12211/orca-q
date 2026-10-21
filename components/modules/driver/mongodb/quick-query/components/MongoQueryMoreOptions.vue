<script setup lang="ts">
import { Input } from '~/components/ui/input';
import type { MongoQueryMoreOptionsRawInput } from '../types';

const rawInput = defineModel<MongoQueryMoreOptionsRawInput>({
  default: () => ({
    project: '',
    sort: '',
    collation: '',
    hint: '',
    maxTimeMS: '',
  }),
});

const props = defineProps<{
  errors?: Partial<Record<keyof MongoQueryMoreOptionsRawInput, string>>;
}>();
</script>

<template>
  <div class="space-y-1">
    <span class="text-xxs leading-0 text-accent-foreground">Options</span>

    <!-- Sort -->
    <div class="flex gap-1 items-center">
      <div
        class="w-20 min-w-20 h-6 flex items-center text-sm font-normal rounded-md select-none"
      >
        Sort
      </div>
      <Input
        id="more-sort"
        v-model="rawInput.sort"
        size="xxs"
        placeholder='{ "createdAt": -1 }'
        class="flex-1"
        :class="{ 'border-destructive': props.errors?.sort }"
      />
    </div>

    <!-- Project & Collation -->
    <div class="flex gap-2 items-center">
      <div class="flex-1 flex gap-1 items-center">
        <div
          class="w-20 min-w-20 h-6 flex items-center text-sm font-normal rounded-md select-none"
        >
          Project
        </div>
        <Input
          id="more-project"
          v-model="rawInput.project"
          size="xxs"
          placeholder='{ "field": 1 }'
          class="flex-1"
          :class="{ 'border-destructive': props.errors?.project }"
        />
      </div>
      <div class="flex-1 flex gap-1 items-center">
        <div
          class="w-20 min-w-20 h-6 flex items-center text-sm font-normal rounded-md select-none"
        >
          Collation
        </div>
        <Input
          id="more-collation"
          v-model="rawInput.collation"
          size="xxs"
          placeholder="{ locale: 'simple' }"
          class="flex-1"
          :class="{ 'border-destructive': props.errors?.collation }"
        />
      </div>
    </div>

    <!-- Index Hint & Max Time MS -->
    <div class="flex gap-2 items-center">
      <div class="flex-1 flex gap-1 items-center">
        <div
          class="w-20 min-w-20 h-6 flex items-center text-sm font-normal rounded-md select-none"
        >
          Index Hint
        </div>
        <Input
          id="more-hint"
          v-model="rawInput.hint"
          size="xxs"
          placeholder="—"
          class="flex-1"
          :class="{ 'border-destructive': props.errors?.hint }"
        />
      </div>
      <div class="flex-1 flex gap-1 items-center">
        <div
          class="w-20 min-w-20 h-6 flex items-center text-sm font-normal rounded-md select-none"
        >
          Max Time
        </div>
        <Input
          id="more-maxtimems"
          v-model="rawInput.maxTimeMS"
          size="xxs"
          type="number"
          placeholder="60000"
          class="flex-1"
          :class="{ 'border-destructive': props.errors?.maxTimeMS }"
        />
      </div>
    </div>
  </div>
</template>
