<script setup lang="ts">
import { Icon } from '#components';

interface Props {
  modelValue: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'add-file'): void;
  (e: 'add-folder'): void;
  (e: 'collapse-all'): void;
}>();

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const onClearSearch = () => {
  emit('update:modelValue', '');
};
</script>

<template>
  <div class="px-3">
    <div class="relative w-full pt-2">
      <Input
        type="text"
        placeholder="Search in all tables or functions"
        class="pr-6 w-full h-8"
        v-model="model"
      />

      <div
        v-if="model"
        class="absolute right-2 top-3.5 w-4 cursor-pointer hover:bg-accent"
        @click="onClearSearch"
      >
        <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
      </div>
    </div>

    <div class="pt-2 flex items-center justify-between">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Explorer
      </p>

      <div class="flex items-center">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="emit('add-file')">
              <Icon
                name="lucide:file-plus-2"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> New File </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="emit('add-folder')">
              <Icon
                name="lucide:folder-plus"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> New Folder </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="emit('collapse-all')">
              <Icon
                name="lucide:copy-minus"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Collapse All </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </div>
</template>
