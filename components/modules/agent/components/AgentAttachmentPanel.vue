<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { useDbAgentAttachments } from '../hooks/useDbAgentAttachments';
import { useFileDownload } from '../hooks/useFileDownload';
import type { AgentRenderedMessage } from '../types';
import { BlockMessageCode } from './block-message';

// TODO : open laster
const props = defineProps<{
  messages: AgentRenderedMessage[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyIconClass } =
  useCopyToClipboard();

const messagesRef = computed(() => props.messages);
const { attachments, files, codes, sources } =
  useDbAgentAttachments(messagesRef);
const { downloadFile } = useFileDownload();

const activeTab = ref<'all' | 'files' | 'code' | 'links'>('all');

type AttachmentItem = {
  type: 'file' | 'code' | 'source';
  id: string;
  name: string;
  description: string;
  icon: string;
  data: any;
};

const mapFile = (f: any): AttachmentItem => ({
  type: 'file',
  id: f.id,
  name: f.filename,
  description: 'Exported File',
  icon: 'hugeicons:file-02',
  data: f,
});
const mapSource = (s: any): AttachmentItem => ({
  type: 'source',
  id: s.id,
  name: s.title || s.filename || s.url,
  description: s.url || 'Link & Resources',
  icon: 'hugeicons:link-square-02',
  data: s,
});
const mapCode = (c: any): AttachmentItem => ({
  type: 'code',
  id: c.id,
  name: c.language ? `Snippet (${c.language})` : 'Snippet',
  description: 'Code Snippet',
  icon: 'hugeicons:code-circle',
  data: c,
});

const groupedItems = computed(() => {
  return {
    all: [
      ...files.value.map(mapFile),
      ...sources.value.map(mapSource),
      ...codes.value.map(mapCode),
    ],
    files: files.value.map(mapFile),
    code: codes.value.map(mapCode),
    links: sources.value.map(mapSource),
  };
});

const getItemsForCurrentTab = computed(() => {
  return groupedItems.value[activeTab.value] || [];
});

const isModalOpen = ref(false);
const selectedItem = ref<AttachmentItem | null>(null);

const openModal = (item: AttachmentItem) => {
  selectedItem.value = item;
  isModalOpen.value = true;
};

const handleDownload = async (item: AttachmentItem | null) => {
  if (!item) return;
  if (item.type === 'file') {
    await downloadFile(item.data);
  } else if (item.type === 'code') {
    const code = item.data.code;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snippet-${item.id.substring(0, 6)}.${item.data.language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (item.type === 'source') {
    window.open(item.data.url, '_blank', 'noopener,noreferrer');
  }
};
</script>

<template>
  <div class="flex h-full flex-col bg-background/50 backdrop-blur-sm">
    <div
      class="flex items-center justify-between border-b px-4 py-3 shadow-sm bg-background/80"
    >
      <div class="flex items-center gap-2">
        <Icon name="hugeicons:attachment" class="size-4" />
        <h3 class="text-sm font-semibold text-foreground">Attachments</h3>
        <Badge
          v-if="attachments.length"
          variant="secondary"
          class="ml-1 px-1.5 h-5 text-[10px]"
        >
          {{ attachments.length }}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        @click="emit('close')"
        title="Close Panel"
      >
        <Icon name="lucide:x" class="size-4" />
      </Button>
    </div>

    <div class="flex-1 overflow-hidden flex flex-col min-h-0 relative">
      <Tabs v-model="activeTab" class="flex-1 flex flex-col h-full w-full">
        <div class="px-4 py-2 border-b bg-muted/20">
          <TabsList class="w-full h-8 grid grid-cols-4 bg-muted/50">
            <TabsTrigger value="all" class="text-xs">All</TabsTrigger>
            <TabsTrigger value="files" class="text-xs">Files</TabsTrigger>
            <TabsTrigger value="code" class="text-xs">Code</TabsTrigger>
            <TabsTrigger value="links" class="text-xs">Links</TabsTrigger>
          </TabsList>
        </div>

        <div class="flex-1 overflow-y-auto w-full p-4 relative">
          <!-- Empty State -->
          <div
            v-if="getItemsForCurrentTab.length === 0"
            class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6 text-center"
          >
            <div
              class="bg-muted size-12 rounded-full flex items-center justify-center mb-4"
            >
              <Icon name="hugeicons:folder-minus" class="size-6" />
            </div>
            <p class="text-sm font-medium">No items found</p>
          </div>

          <!-- Tab contents -->
          <TabsContent
            v-for="tab in ['all', 'files', 'code', 'links'] as const"
            :key="tab"
            :value="tab"
            class="h-full mt-0 focus-visible:ring-0"
          >
            <div class="space-y-3 pb-8">
              <template v-for="item in groupedItems[tab]" :key="item.id">
                <div
                  class="p-3 border rounded-xl bg-card hover:bg-accent/50 transition-colors flex items-center gap-3 cursor-pointer group"
                  @click="openModal(item)"
                >
                  <div
                    class="bg-primary/10 text-primary p-2 rounded-lg group-hover:bg-primary/20 transition-colors"
                  >
                    <Icon :name="item.icon" class="size-4" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium truncate">{{ item.name }}</p>
                    <p
                      class="text-xs text-muted-foreground truncate"
                      :class="item.type === 'source' ? 'text-primary/70' : ''"
                    >
                      {{ item.description }}
                    </p>
                  </div>
                  <Icon
                    name="hugeicons:arrow-right-01"
                    class="size-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                  />
                </div>
              </template>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>

    <Dialog :open="isModalOpen" @update:open="isModalOpen = $event">
      <DialogContent
        class="sm:max-w-[700px] w-[90vw] max-h-[85vh] flex flex-col overflow-hidden"
      >
        <DialogHeader class="shrink-0 border-b pb-4">
          <DialogTitle class="flex items-center gap-2 overflow-hidden">
            <Icon
              :name="selectedItem?.icon || 'hugeicons:file-02'"
              class="size-5 shrink-0"
            />
            <span class="truncate">{{ selectedItem?.name }}</span>
          </DialogTitle>
        </DialogHeader>

        <div class="flex-1 overflow-y-auto min-h-0 py-4 -mx-6 px-6 relative">
          <template v-if="selectedItem?.type === 'file'">
            <div
              class="text-sm bg-muted/50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono"
              v-if="selectedItem.data.encoding === 'utf8'"
            >
              {{ selectedItem.data.content }}
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-md border border-dashed h-full min-h-[150px]"
            >
              <Icon
                name="hugeicons:file-unknown"
                class="size-16 text-muted-foreground/50 mb-4"
              />
              <p class="text-foreground font-medium">Binary file format</p>
              <p class="text-sm text-muted-foreground text-center mt-1">
                Preview is not available for this file type. Please download to
                view.
              </p>
            </div>
          </template>

          <template v-else-if="selectedItem?.type === 'code'">
            <div class="rounded-lg overflow-hidden border">
              <BlockMessageCode
                :id="selectedItem.data.id"
                :code="selectedItem.data.code"
                :language="selectedItem.data.language"
                :is-streaming="false"
                :is-block-streaming="false"
              />
            </div>
          </template>

          <template v-else-if="selectedItem?.type === 'source'">
            <div class="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border">
              <div>
                <h4
                  class="text-xs font-semibold text-muted-foreground uppercase mb-1"
                >
                  Title
                </h4>
                <p class="text-sm font-medium">
                  {{
                    selectedItem.data.title ||
                    selectedItem.data.filename ||
                    'Untitled Resource'
                  }}
                </p>
              </div>
              <div>
                <h4
                  class="text-xs font-semibold text-muted-foreground uppercase mb-1"
                >
                  URL
                </h4>
                <a
                  :href="selectedItem.data.url"
                  target="_blank"
                  class="text-sm text-primary hover:underline break-all flex items-center gap-1"
                >
                  {{ selectedItem.data.url }}
                  <Icon
                    name="hugeicons:link-square-02"
                    class="size-3 shrink-0"
                  />
                </a>
              </div>
            </div>
          </template>
        </div>

        <DialogFooter
          class="shrink-0 flex sm:justify-between items-center sm:flex-row flex-col-reverse gap-2 border-t pt-4 mt-auto"
        >
          <Button
            variant="outline"
            @click="isModalOpen = false"
            class="w-full sm:w-auto"
          >
            Close
          </Button>
          <div class="flex gap-2 w-full sm:w-auto">
            <Button
              v-if="selectedItem?.type === 'source'"
              class="w-full sm:w-auto"
              @click="handleDownload(selectedItem)"
            >
              Open Link
              <Icon name="hugeicons:link-square-02" class="size-4 ml-2" />
            </Button>
            <Button
              v-else
              class="w-full sm:w-auto"
              @click="handleDownload(selectedItem)"
            >
              <Icon name="hugeicons:download-04" class="size-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
