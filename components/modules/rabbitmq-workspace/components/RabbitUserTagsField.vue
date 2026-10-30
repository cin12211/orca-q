<script setup lang="ts">
import { RABBIT_USER_TAG_DESCRIPTIONS } from '../constants';

const props = defineProps<{
  idPrefix: string;
  /** Tags that cannot be unticked, e.g. administrator on yourself. */
  lockedTags?: string[];
}>();

const tags = defineModel<string[]>({ required: true });

const tagOptions = Object.keys(RABBIT_USER_TAG_DESCRIPTIONS);
const customTags = computed(() =>
  tags.value.filter(tag => !tagOptions.includes(tag))
);

const isLocked = (tag: string) => Boolean(props.lockedTags?.includes(tag));

const toggleTag = (tag: string, isChecked: boolean | 'indeterminate') => {
  if (isLocked(tag)) return;

  tags.value =
    isChecked === true
      ? [...tags.value, tag]
      : tags.value.filter(item => item !== tag);
};
</script>

<template>
  <div class="space-y-2">
    <Label>Tags</Label>
    <div class="grid gap-2">
      <label
        v-for="tag in tagOptions"
        :key="tag"
        class="flex items-start gap-2 text-sm cursor-pointer"
        :class="isLocked(tag) && 'cursor-not-allowed opacity-70'"
      >
        <Checkbox
          :id="`${idPrefix}-tag-${tag}`"
          :model-value="tags.includes(tag)"
          :disabled="isLocked(tag)"
          class="mt-0.5"
          @update:model-value="toggleTag(tag, $event)"
        />
        <span>
          <span class="font-medium">{{ tag }}</span>
          <span class="block text-xs text-muted-foreground">
            {{ RABBIT_USER_TAG_DESCRIPTIONS[tag] }}
          </span>
        </span>
      </label>
    </div>
    <p v-if="customTags.length" class="text-xs text-muted-foreground">
      Custom tags kept as they are: {{ customTags.join(', ') }}
    </p>
    <p class="text-xs text-muted-foreground">
      No tags: the user can connect over AMQP but not log in to the Management
      UI.
    </p>
  </div>
</template>
