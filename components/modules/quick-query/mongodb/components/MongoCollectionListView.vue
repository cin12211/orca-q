<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { useVirtualizer } from '@tanstack/vue-virtual';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { MongoDocument } from '../types';

const props = defineProps<{ documents: MongoDocument[] }>();

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

const onCopyDocument = (doc: MongoDocument) => {
  const jsonStr = JSON.stringify(doc, null, 2);
  return handleCopyWithKey(doc._id, jsonStr);
};

const expandedDocIds = ref<Set<string | number>>(new Set());

const getDocId = (doc: MongoDocument, index: number): string | number => {
  return doc?._id !== undefined && doc?._id !== null ? String(doc._id) : index;
};

const isExpanded = (docId: string | number) => expandedDocIds.value.has(docId);

const toggleExpandDocument = (docId: string | number) => {
  const next = new Set(expandedDocIds.value);
  if (next.has(docId)) {
    next.delete(docId);
  } else {
    next.add(docId);
  }
  expandedDocIds.value = next;
};

const parentRef = ref<HTMLElement | null>(null);

const rowVirtualizer = useVirtualizer({
  get count() {
    return props.documents.length;
  },
  getScrollElement: () => parentRef.value,
  estimateSize: () => 120,
  overscan: 5,
});

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

const measureElement = (el: any) => {
  if (!el) {
    return;
  }

  rowVirtualizer.value.measureElement(el);

  return undefined;
};

const scrollToTop = () => {
  rowVirtualizer.value.scrollToIndex(0);
  if (parentRef.value) {
    parentRef.value.scrollTop = 0;
  }
};

defineExpose({ scrollToTop });
</script>

<template>
  <div
    ref="parentRef"
    class="h-full overflow-auto contain-strict [overflow-anchor:none] p-2"
  >
    <div
      :style="{
        height: `${totalSize}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <div
        v-for="virtualRow in virtualRows"
        :key="virtualRow.key.toString()"
        :data-index="virtualRow.index"
        :ref="measureElement"
        class="[overflow-anchor:none]"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
        }"
      >
        <div class="rounded-md border border-border/60 bg-card shadow-xs mb-2">
          <div
            class="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40 text-xs font-mono select-none"
          >
            <div class="flex items-center gap-2 font-medium">
              <Icon name="hugeicons:files-01" class="size-4!" />
              <span>_id: {{ documents[virtualRow.index]._id }}</span>
            </div>

            <div class="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    class="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    @click="
                      toggleExpandDocument(
                        getDocId(documents[virtualRow.index], virtualRow.index)
                      )
                    "
                  >
                    <Icon
                      :name="
                        isExpanded(
                          getDocId(
                            documents[virtualRow.index],
                            virtualRow.index
                          )
                        )
                          ? 'hugeicons:unfold-less'
                          : 'hugeicons:unfold-more'
                      "
                      class="size-3.5!"
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {{
                      isExpanded(
                        getDocId(documents[virtualRow.index], virtualRow.index)
                      )
                        ? 'Collapse nested keys'
                        : 'Expand all nested keys'
                    }}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    class="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    @click="onCopyDocument(documents[virtualRow.index])"
                  >
                    <Icon
                      :name="
                        getCopyIcon(isCopied(documents[virtualRow.index]._id))
                      "
                      :class="[
                        'size-3.5',
                        isCopied(documents[virtualRow.index]._id) &&
                          'text-emerald-500 font-bold',
                      ]"
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {{
                      getCopyTooltip(
                        isCopied(documents[virtualRow.index]._id),
                        'Copy document JSON'
                      )
                    }}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div class="m-2 overflow-x-auto text-xs bg-background">
            <VueJsonPretty
              :data="documents[virtualRow.index]"
              :deep="
                isExpanded(
                  getDocId(documents[virtualRow.index], virtualRow.index)
                )
                  ? 99
                  : 1
              "
              :show-double-quotes="true"
              :show-length="false"
              :show-line="false"
              :show-icon="true"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
