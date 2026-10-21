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
import type { McpClientSnippet } from '../../constants';

const props = defineProps<{
  open: boolean;
  sessionName: string;
  token: string;
  snippets: McpClientSnippet[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  copy: [text: string];
}>();
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="border max-w-xl">
      <DialogHeader>
        <DialogTitle>Token for "{{ props.sessionName }}"</DialogTitle>
        <DialogDescription>
          Copy it now. OrcaQ only keeps a hash, so this token is shown once. If
          you lose it, regenerate a new one from the session list.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        <div class="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <Icon name="hugeicons:key-01" class="size-4! shrink-0" />
          <code class="text-xs flex-1 break-all">{{ props.token }}</code>
          <Button
            type="button"
            size="iconSm"
            variant="ghost"
            @click="emit('copy', props.token)"
          >
            <Icon name="hugeicons:copy-01" class="size-4!" />
          </Button>
        </div>

        <div
          v-for="snippet in props.snippets"
          :key="snippet.name"
          class="rounded-md border"
        >
          <div class="flex items-center justify-between px-3 py-1 border-b">
            <span class="text-xs text-muted-foreground">{{
              snippet.name
            }}</span>
            <Button
              type="button"
              size="iconSm"
              variant="ghost"
              @click="emit('copy', snippet.code)"
            >
              <Icon name="hugeicons:copy-01" class="size-4!" />
            </Button>
          </div>
          <pre class="text-xs px-3 py-2 overflow-x-auto">{{
            snippet.code
          }}</pre>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" size="sm" @click="emit('update:open', false)">
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
