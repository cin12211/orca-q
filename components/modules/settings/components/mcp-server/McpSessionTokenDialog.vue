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
import { maskMcpToken } from '~/core/helpers/mcp-token';
import { buildMcpClientSnippets } from '../../constants';
import McpTokenField from './McpTokenField.vue';

const props = defineProps<{
  open: boolean;
  sessionName: string;
  token: string;
  endpointUrl: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  copy: [text: string];
}>();

// Snippets are displayed with a masked token; copying uses the real one.
const snippets = computed(() => {
  const realSnippets = buildMcpClientSnippets(props.endpointUrl, props.token);

  return buildMcpClientSnippets(
    props.endpointUrl,
    maskMcpToken(props.token)
  ).map((snippet, index) => ({
    ...snippet,
    copyCode: realSnippets[index]?.code ?? '',
  }));
});
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="border max-w-xl">
      <DialogHeader>
        <DialogTitle>Connect "{{ props.sessionName }}"</DialogTitle>
        <DialogDescription>
          Add this session to your MCP client. You can come back here any time
          from the session list.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        <McpTokenField :token="props.token" @copy="emit('copy', $event)" />

        <div
          v-for="snippet in snippets"
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
              title="Copy with token"
              @click="emit('copy', snippet.copyCode)"
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
