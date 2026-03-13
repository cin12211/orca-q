<script setup lang="ts">
import { computed, ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BaseEmpty from '~/components/base/BaseEmpty.vue';
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
  data: f.result,
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

const formatBytes = (value?: number) => {
  if (value === undefined || value === null) return '—';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const selectedTypeLabel = computed(() => {
  if (!selectedItem.value) return '';
  if (selectedItem.value.type === 'file') return 'File';
  if (selectedItem.value.type === 'code') return 'Code';
  return 'Link';
});

const canOpenSource = computed(
  () => selectedItem.value?.type === 'source' && !!selectedItem.value.data?.url
);

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
    if (item.data?.url) {
      window.open(item.data.url, '_blank', 'noopener,noreferrer');
    }
  }
};
</script>

<template>
  <div
    class="flex h-full flex-col bg-sidebar-primary-foreground/50 z-50 p-2 gap-2"
  >
    <div class="flex shrink-0 items-center justify-between gap-2">
      <div class="flex items-center min-w-0 gap-1 flex-1">
        <Icon name="hugeicons:attachment" class="size-4" />
        <h3 class="text-sm font-semibold text-foreground">Attachments</h3>

        <p class="text-xs">
          {{ attachments.length }}
        </p>
      </div>

      <Button size="icon" variant="ghost" class="size-7" @click="emit('close')">
        <Icon name="lucide:x" class="size-4" />
      </Button>
    </div>

    <div class="flex-1 overflow-hidden flex flex-col min-h-0 relative">
      <Tabs v-model="activeTab">
        <TabsList class="h-8">
          <TabsTrigger value="all" class="text-xs cursor-pointer"
            >All</TabsTrigger
          >
          <TabsTrigger value="files" class="text-xs cursor-pointer"
            >Files</TabsTrigger
          >
          <TabsTrigger value="code" class="text-xs cursor-pointer"
            >Code</TabsTrigger
          >
          <TabsTrigger value="links" class="text-xs cursor-pointer"
            >Links</TabsTrigger
          >
        </TabsList>

        <div class="flex-1 overflow-y-auto w-full relative">
          <!-- Empty State -->
          <div
            v-if="getItemsForCurrentTab.length === 0"
            class="absolute inset-0 flex items-center justify-center p-6"
          >
            <BaseEmpty
              title="No items found"
              desc="Add an attachment to see it here."
            />
          </div>

          <!-- Tab contents -->
          <TabsContent
            v-for="tab in ['all', 'files', 'code', 'links'] as const"
            :key="tab"
            :value="tab"
            class="h-full mt-0 focus-visible:ring-0"
          >
            <div class="space-y-2">
              <template v-for="item in groupedItems[tab]" :key="item.id">
                <div
                  class="p-2 px-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors flex items-center gap-2 cursor-pointer group"
                  @click="openModal(item)"
                >
                  <Icon :name="item.icon" class="size-5!" />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium truncate">{{ item.name }}</p>
                    <p
                      class="text-xxs text-muted-foreground truncate"
                      :class="item.type === 'source' ? 'text-primary/70' : ''"
                    >
                      {{ item.description }}
                    </p>
                  </div>
                  <Icon
                    name="hugeicons:view"
                    class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
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
        class="max-w-[50vw]! w-full max-h-[70vh] p-0 flex flex-col overflow-hidden"
      >
        <DialogHeader class="p-4 pb-2 text-left">
          <div class="flex items-center gap-2">
            <Icon
              :name="selectedItem?.icon || 'hugeicons:file-02'"
              class="size-5!"
            />
            <div class="min-w-0 flex-1">
              <DialogTitle class="truncate flex items-center gap-2">
                {{ selectedItem?.name || 'Attachment Preview' }}

                <div class="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="secondary" class="h-5 px-1.5">
                    {{ selectedTypeLabel }}
                  </Badge>
                  <Badge
                    v-if="selectedItem?.type === 'file'"
                    variant="outline"
                    class="h-5 px-1.5"
                  >
                    {{ selectedItem.data.format || 'file' }}
                  </Badge>
                  <Badge
                    v-if="selectedItem?.type === 'file'"
                    variant="outline"
                    class="h-5 px-1.5"
                  >
                    {{ formatBytes(selectedItem.data.fileSize) }}
                  </Badge>
                  <Badge
                    v-if="selectedItem?.type === 'code'"
                    variant="outline"
                    class="h-5 px-1.5"
                  >
                    {{ selectedItem.data.language || 'text' }}
                  </Badge>
                  <Badge
                    v-if="
                      selectedItem?.type === 'source' &&
                      selectedItem.data?.mediaType
                    "
                    variant="outline"
                    class="h-5 px-1.5"
                  >
                    {{ selectedItem.data.mediaType }}
                  </Badge>
                </div>
              </DialogTitle>
              <DialogDescription class="text-sm">
                Preview attachment details and content.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="flex-1 overflow-y-auto px-4 space-y-4">
          <template v-if="selectedItem?.type === 'file'">
            <div class="space-y-2">
              <div
                v-if="selectedItem.data.encoding === 'utf8'"
                class="text-sm bg-muted/50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono border"
              >
                {{ selectedItem.data.content }}
              </div>
              <div
                v-else
                class="flex flex-col items-center justify-center p-5 bg-muted/20 rounded-md border border-dashed min-h-[140px]"
              >
                <Icon
                  name="hugeicons:file-unknown"
                  class="size-12 text-muted-foreground/50 mb-3"
                />
                <p class="text-foreground text-sm font-medium">
                  Binary file format
                </p>
                <p class="text-xs text-muted-foreground text-center mt-1">
                  Preview is not available for this file type. Download to view.
                </p>
              </div>
            </div>
          </template>

          <template v-else-if="selectedItem?.type === 'code'">
            <div class="text-sm">
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
            <div class="flex flex-col gap-3 p-3 bg-muted/30 rounded-md border">
              <div>
                <h4
                  class="text-[11px] font-semibold text-muted-foreground uppercase mb-1"
                >
                  Title
                </h4>
                <p class="text-xs font-medium">
                  {{
                    selectedItem.data.title ||
                    selectedItem.data.filename ||
                    'Untitled Resource'
                  }}
                </p>
              </div>
              <div>
                <h4
                  class="text-[11px] font-semibold text-muted-foreground uppercase mb-1"
                >
                  URL
                </h4>
                <p
                  v-if="selectedItem.data.url"
                  class="text-xs text-primary break-all flex items-center gap-1"
                >
                  <a
                    :href="selectedItem.data.url"
                    target="_blank"
                    class="hover:underline"
                  >
                    {{ selectedItem.data.url }}
                  </a>
                  <Icon
                    name="hugeicons:link-square-02"
                    class="size-3 shrink-0"
                  />
                </p>
                <p v-else class="text-xs text-muted-foreground">
                  No URL provided.
                </p>
              </div>
            </div>
          </template>
        </div>

        <DialogFooter class="p-4 flex justify-end pt-0">
          <Button variant="outline" size="sm" @click="isModalOpen = false">
            Close
          </Button>
          <div class="flex gap-2">
            <Button
              v-if="selectedItem?.type === 'source'"
              size="sm"
              :disabled="!canOpenSource"
              @click="handleDownload(selectedItem)"
            >
              Open Link
              <Icon name="hugeicons:link-square-02" class="size-3 ml-2" />
            </Button>
            <Button v-else size="sm" @click="handleDownload(selectedItem)">
              Download

              <Icon name="hugeicons:download-04" class="size-3" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
