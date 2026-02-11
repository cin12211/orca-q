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
import { Button } from '~/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { useCodeHighlighter } from '~/core/composables/useSqlHighlighter';

const props = defineProps<{
  open: boolean;
  sql: string;
  title: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const { highlightSql } = useCodeHighlighter();
const { copied, handleCopy, getCopyIcon, getCopyIconClass, getCopyTooltip } =
  useCopyToClipboard();

// Highlight SQL with Shiki
const highlightedSql = computed(() => {
  if (!props.sql) {
    return null;
  }

  return highlightSql(props.sql);
});

const onCopy = () => handleCopy(props.sql);

const onClose = () => {
  emit('update:open', false);
};
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border w-[55vw]! max-w-[55vw]!">
      <!-- DDL Loading Overlay -->
      <LoadingOverlay :visible="isLoading" />
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center text-base font-medium">
          <Icon name="lucide:code" class="size-4 mr-2" />
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          Generated SQL statement. Click copy to use.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="relative">
        <div class="absolute top-2 right-2 z-10">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="iconSm" @click="onCopy">
                <Icon
                  :name="getCopyIcon(copied)"
                  class="size-4"
                  :class="getCopyIconClass(copied)"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ getCopyTooltip(copied, 'Copy SQL') }}</p>
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
        <AlertDialogCancel class="border font-normal" @click="onClose">
          Close
        </AlertDialogCancel>
        <AlertDialogAction
          class="border font-normal flex gap-1"
          @click="onCopy"
        >
          <Icon :name="getCopyIcon(copied)" class="size-4" />
          {{ getCopyTooltip(copied, 'Copy to Clipboard') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
