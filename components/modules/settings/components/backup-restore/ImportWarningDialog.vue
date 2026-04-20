<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BackupSummary } from '../../hooks/backupData';

const props = defineProps<{
  open: boolean;
  summary: BackupSummary | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [];
}>();

const nonEmptyCollections = computed(() =>
  (props.summary?.collections ?? []).filter(item => item.count > 0)
);
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border max-w-lg">
      <AlertDialogHeader>
        <div class="flex items-center gap-2 mb-1">
          <Icon
            name="hugeicons:alert-02"
            class="size-5! text-amber-500 shrink-0"
          />
          <AlertDialogTitle>Check your backup before restoring</AlertDialogTitle>
        </div>

        <AlertDialogDescription class="space-y-3 text-left">
          <span class="block">
            This backup will be merged into your current data. Items with the
            same ID will be updated, new items will be added, and anything not
            included in the backup will stay unchanged.
          </span>

          <div
            v-if="props.summary"
            class="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-3"
          >
            <div>
              <p
                class="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                Sections
              </p>
              <p class="text-sm font-medium text-foreground">
                {{ props.summary.totalCollections }}
              </p>
            </div>
            <div>
              <p
                class="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                Items
              </p>
              <p class="text-sm font-medium text-foreground">
                {{ props.summary.totalRecords }}
              </p>
            </div>
            <div>
              <p
                class="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                Local Settings
              </p>
              <p class="text-sm font-medium text-foreground">
                {{ props.summary.localStorageKeys }}
              </p>
            </div>
          </div>

          <div v-if="nonEmptyCollections.length > 0" class="space-y-1.5">
            <p class="text-xs font-medium text-foreground">
              Data found in this backup
            </p>
            <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <Badge
                v-for="item in nonEmptyCollections"
                :key="item.collection"
                variant="secondary"
                class="text-xs"
              >
                {{ item.collection }} · {{ item.count }}
              </Badge>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel
          class="border"
          :disabled="props.loading"
          @click="emit('update:open', false)"
        >
          Go Back
        </AlertDialogCancel>
        <Button :disabled="props.loading" @click="emit('confirm')">
          <Icon
            :name="
              props.loading ? 'hugeicons:loading-03' : 'hugeicons:file-import'
            "
            class="size-4! mr-1.5"
            :class="{ 'animate-spin': props.loading }"
          />
          {{ props.loading ? 'Restoring backup…' : 'Restore Backup' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
