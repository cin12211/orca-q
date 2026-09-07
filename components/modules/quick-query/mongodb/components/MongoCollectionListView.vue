<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { MongoDocument } from '../types';
import MongoCollectionListItem from './MongoCollectionListItem.vue';

type VirtualItemKey = string | number | bigint;

const props = withDefaults(
  defineProps<{
    documents: MongoDocument[];
    savingDocId?: string | null;
  }>(),
  {
    savingDocId: null,
  }
);

const emit = defineEmits<{
  (
    e: 'update-document',
    payload: { id: string; document: Record<string, unknown> }
  ): void;
}>();

const expandedDocIds = ref<Set<string | number>>(new Set());
const activeEditDocId = ref<string | null>(null);

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

const onStartEdit = (docId: string) => {
  activeEditDocId.value = docId;
};

const onCancelEdit = () => {
  activeEditDocId.value = null;
};

const onSaveDocument = (docId: string, updatedDoc: Record<string, unknown>) => {
  emit('update-document', { id: docId, document: updatedDoc });
};

const onExitEditMode = (docId: string) => {
  if (activeEditDocId.value === docId) {
    activeEditDocId.value = null;
  }
};

const parentRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string, HTMLElement | null>>({});

const setItemRef = (el: any, key: VirtualItemKey) => {
  const k = String(key);
  if (el) {
    itemRefs.value[k] = el;
    rowVirtualizer.value.measureElement(el);
  } else {
    delete itemRefs.value[k];
  }
};

const onItemResize = (key: VirtualItemKey) => {
  nextTick(() => {
    const el = itemRefs.value[String(key)];
    if (el) {
      rowVirtualizer.value.measureElement(el);
    }
  });
};

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

const scrollToTop = () => {
  rowVirtualizer.value.scrollToIndex(0);
  if (parentRef.value) {
    parentRef.value.scrollTop = 0;
  }
};

defineExpose({ scrollToTop, onExitEditMode });
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
        :ref="el => setItemRef(el, virtualRow.key)"
        class="[overflow-anchor:none]"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
        }"
      >
        <MongoCollectionListItem
          :document="documents[virtualRow.index]"
          :is-expanded="
            isExpanded(getDocId(documents[virtualRow.index], virtualRow.index))
          "
          :is-editing="
            activeEditDocId ===
            String(getDocId(documents[virtualRow.index], virtualRow.index))
          "
          :is-saving="
            savingDocId ===
            String(getDocId(documents[virtualRow.index], virtualRow.index))
          "
          @toggle-expand="
            toggleExpandDocument(
              getDocId(documents[virtualRow.index], virtualRow.index)
            )
          "
          @start-edit="
            onStartEdit(
              String(getDocId(documents[virtualRow.index], virtualRow.index))
            )
          "
          @cancel-edit="onCancelEdit"
          @save="
            updatedDoc =>
              onSaveDocument(
                String(getDocId(documents[virtualRow.index], virtualRow.index)),
                updatedDoc
              )
          "
          @resize="() => onItemResize(virtualRow.key)"
        />
      </div>
    </div>
  </div>
</template>
