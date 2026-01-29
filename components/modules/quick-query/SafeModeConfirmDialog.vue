<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '~/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useCodeHighlighter } from '~/composables/useSqlHighlighter';
import { copyToClipboard } from '~/utils/common/copyData';

const props = defineProps<{
  open: boolean;
  sql: string;
  type: 'save' | 'delete';
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const { highlightSql } = useCodeHighlighter();
const copied = ref(false);

const title = computed(() => {
  return props.type === 'save'
    ? 'Confirm Save Operation'
    : 'Confirm Delete Operation';
});

const description = computed(() => {
  return props.type === 'save'
    ? 'The following SQL will be executed to save your changes:'
    : 'The following SQL will be executed to delete the selected rows:';
});

const actionLabel = computed(() => {
  return props.type === 'save' ? 'Save' : 'Delete';
});

// Highlight SQL with Shiki
const highlightedSql = computed(() => {
  if (!props.sql) {
    return null;
  }

  return highlightSql(props.sql);
});

const handleCopy = async () => {
  await copyToClipboard(props.sql);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};

const onConfirm = () => {
  emit('confirm');
  emit('update:open', false);
};

const onCancel = () => {
  emit('cancel');
  emit('update:open', false);
};
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border w-[55vw]! max-w-[55vw]!">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center text-base font-medium">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="relative">
        <div class="absolute top-2 right-2 z-10">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="iconSm" @click="handleCopy">
                <Icon
                  :name="copied ? 'hugeicons:tick-02' : 'hugeicons:copy-01'"
                  class="size-4"
                  :class="copied ? 'text-green-500' : 'text-muted-foreground'"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ copied ? 'Copied!' : 'Copy SQL' }}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div
          class="max-h-96 w-full overflow-y-auto rounded-md border bg-muted/50"
        >
          <div
            v-if="highlightedSql"
            class="text-xs rounded-md overflow-x-auto [&>pre]:p-3 [&>pre]:rounded-md [&>pre]:whitespace-pre-wrap"
            v-html="highlightedSql"
          />
          <pre
            v-else
            class="text-xs font-mono whitespace-pre-wrap break-all p-3"
            >{{ sql }}</pre
          >
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel class="border font-normal" @click="onCancel">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          class="border font-normal flex gap-1"
          @click="onConfirm"
        >
          <Icon
            :name="type === 'save' ? 'lucide:save' : 'lucide:trash-2'"
            class="size-4"
          />
          {{ actionLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
