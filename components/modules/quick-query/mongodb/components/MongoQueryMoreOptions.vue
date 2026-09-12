<script setup lang="ts">
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
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

const emit = defineEmits<{
  execute: [];
  close: [];
}>();

const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    emit('execute');
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
};
</script>

<template>
  <div class="py-1 text-xs space-y-1.5 select-none" @keydown="onKeydown">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
      <!-- Col 1 -->
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <Label
            for="more-project"
            class="text-xs font-medium text-muted-foreground w-20 shrink-0"
          >
            Project
          </Label>
          <div class="flex-1">
            <Input
              id="more-project"
              v-model="rawInput.project"
              size="xxs"
              placeholder="{}"
              class="font-mono"
              :class="{ 'border-destructive': props.errors?.project }"
              @keyup.enter="emit('execute')"
            />
            <p
              v-if="props.errors?.project"
              class="text-xxs text-destructive mt-0.5"
            >
              {{ props.errors.project }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Label
            for="more-collation"
            class="text-xs font-medium text-muted-foreground w-20 shrink-0"
          >
            Collation
          </Label>
          <div class="flex-1">
            <Input
              id="more-collation"
              v-model="rawInput.collation"
              size="xxs"
              placeholder="{ locale: 'simple' }"
              class="font-mono"
              :class="{ 'border-destructive': props.errors?.collation }"
              @keyup.enter="emit('execute')"
            />
            <p
              v-if="props.errors?.collation"
              class="text-xxs text-destructive mt-0.5"
            >
              {{ props.errors.collation }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Label
            for="more-hint"
            class="text-xs font-medium text-muted-foreground w-20 shrink-0"
          >
            Index Hint
          </Label>
          <div class="flex-1">
            <Input
              id="more-hint"
              v-model="rawInput.hint"
              size="xxs"
              placeholder="—"
              class="font-mono"
              :class="{ 'border-destructive': props.errors?.hint }"
              @keyup.enter="emit('execute')"
            />
            <p
              v-if="props.errors?.hint"
              class="text-xxs text-destructive mt-0.5"
            >
              {{ props.errors.hint }}
            </p>
          </div>
        </div>
      </div>

      <!-- Col 2 -->
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <Label
            for="more-sort"
            class="text-xs font-medium text-muted-foreground w-20 shrink-0"
          >
            Sort
          </Label>
          <div class="flex-1">
            <Input
              id="more-sort"
              v-model="rawInput.sort"
              size="xxs"
              placeholder="{}"
              class="font-mono"
              :class="{ 'border-destructive': props.errors?.sort }"
              @keyup.enter="emit('execute')"
            />
            <p
              v-if="props.errors?.sort"
              class="text-xxs text-destructive mt-0.5"
            >
              {{ props.errors.sort }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Label
            for="more-maxtimems"
            class="text-xs font-medium text-muted-foreground w-20 shrink-0"
          >
            Max Time MS
          </Label>
          <div class="flex-1">
            <Input
              id="more-maxtimems"
              v-model="rawInput.maxTimeMS"
              size="xxs"
              type="number"
              placeholder="60000"
              class="font-mono"
              :class="{ 'border-destructive': props.errors?.maxTimeMS }"
              @keyup.enter="emit('execute')"
            />
            <p
              v-if="props.errors?.maxTimeMS"
              class="text-xxs text-destructive mt-0.5"
            >
              {{ props.errors.maxTimeMS }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
