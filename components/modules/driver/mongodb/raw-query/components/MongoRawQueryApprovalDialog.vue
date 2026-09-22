<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';

defineProps<{
  open: boolean;
  loading?: boolean;
  operations: MongoRawQueryOperation[];
}>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('cancel')" v-if="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"
          ><Icon name="hugeicons:alert-02" class="size-5 text-amber-500" />
          Confirm MongoDB write</DialogTitle
        >
        <DialogDescription
          >This script will perform the following
          operation(s).</DialogDescription
        >
      </DialogHeader>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="operation in operations"
          :key="operation.id"
          class="rounded border p-2 text-sm"
        >
          <div class="flex items-center gap-2">
            <code>{{ operation.method }}</code
            ><span v-if="operation.database" class="text-muted-foreground"
              >in {{ operation.database }}</span
            ><span v-if="operation.collection" class="text-muted-foreground"
              >on {{ operation.collection }}</span
            ><Badge variant="destructive">{{ operation.risk }}</Badge>
          </div>
          <div class="text-xs text-muted-foreground mt-1 break-words">
            {{ operation.summary }}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('cancel')">Cancel</Button>
        <Button
          data-testid="confirm-mongo-raw-write"
          :disabled="loading"
          @click="emit('confirm')"
          >Confirm and run</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
