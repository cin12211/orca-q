<script setup lang="ts">
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';

const props = defineProps<{
  hasChanges: boolean;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'onPreview'): void;
  (e: 'onSave'): void;
  (e: 'onDiscard'): void;
}>();
</script>

<template>
  <div :class="['flex items-center justify-between p-1 rounded-md bg-muted']">
    <div class="flex items-center gap-1">
      <Tooltip v-if="hasChanges">
        <TooltipTrigger as-child>
          <div>
            <Button
              variant="outline"
              size="xxs"
              :disabled="isSaving"
              @click="emit('onPreview')"
            >
              <Icon name="lucide:file-search" class="size-4" />
              Preview changes
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Preview SQL changes before saving</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <div>
            <Button
              variant="outline"
              size="xxs"
              :disabled="!hasChanges || isSaving"
              @click="emit('onSave')"
            >
              <Icon
                v-if="isSaving"
                name="hugeicons:loading-03"
                class="size-4 animate-spin"
              />
              <Icon v-else name="lucide:save" class="size-4" />
              Save
              <ContextMenuShortcut>⌘S</ContextMenuShortcut>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Save routine changes</p>
          <p v-if="!hasChanges" class="text-xs text-muted-foreground">
            No changes to save
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip v-if="hasChanges">
        <TooltipTrigger as-child>
          <div>
            <Button
              variant="outline"
              size="xxs"
              :disabled="isSaving"
              @click="emit('onDiscard')"
            >
              <Icon name="lucide:undo-2" class="size-4" /> discard changes
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Discard changes</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
