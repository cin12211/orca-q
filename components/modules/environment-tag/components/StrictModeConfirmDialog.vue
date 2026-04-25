<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EnvironmentTag } from '../types/environmentTag.types';
import EnvTagBadge from './EnvTagBadge.vue';

const CONFIRM_PHRASE = 'this is prod';

const props = defineProps<{
  open: boolean;
  strictTags: EnvironmentTag[];
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const inputValue = ref('');

watch(
  () => props.open,
  open => {
    if (open) inputValue.value = '';
  }
);

const isConfirmEnabled = computed(() => inputValue.value === CONFIRM_PHRASE);

const handleConfirm = () => {
  if (isConfirmEnabled.value) emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <Dialog :open="open" @update:open="!$event && handleCancel()" v-if="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive">
          <Icon name="hugeicons:alert-02" class="size-5" />
          Production Environment Warning
        </DialogTitle>
        <DialogDescription>
          This connection is tagged as a production environment. Proceed with
          caution.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div>
          <p class="text-sm text-muted-foreground mb-2">
            Strict-mode tag(s) on this connection:
          </p>
          <div class="flex flex-wrap gap-1">
            <EnvTagBadge v-for="tag in strictTags" :key="tag.id" :tag="tag" />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="strict-confirm-input">
            Type
            <code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              {{ CONFIRM_PHRASE }}
            </code>
            to continue:
          </Label>
          <Input
            id="strict-confirm-input"
            v-model="inputValue"
            :placeholder="CONFIRM_PHRASE"
            autocomplete="off"
            @keydown.enter="handleConfirm"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleCancel">Cancel</Button>
        <Button :disabled="!isConfirmEnabled" @click="handleConfirm">
          Connect
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
