<script setup lang="ts">
import { computed } from 'vue';
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';
import type { MongoDialectState, RawQueryContext } from '../../registry';
import { useMongoApproval, type MongoPendingApproval } from '../hooks';
import MongoRawQueryApprovalDialog from './MongoRawQueryApprovalDialog.vue';

const props = withDefaults(
  defineProps<{
    documents?: Record<string, unknown>[];
    context?: RawQueryContext<MongoDialectState>;
    pendingApproval?: MongoPendingApproval | null;
  }>(),
  {
    documents: undefined,
    context: undefined,
    pendingApproval: undefined,
  }
);

const emit = defineEmits<{
  confirmApproval: [];
  cancelApproval: [];
}>();

const approval = useMongoApproval();

const dialectState = computed(() => {
  const ds = props.context?.dialectState;
  if (ds && typeof ds === 'object' && 'value' in ds) {
    return (ds as { value: MongoDialectState }).value;
  }
  return ds as MongoDialectState | undefined;
});

const activePendingApproval = computed(() => {
  if (props.pendingApproval !== undefined) return props.pendingApproval;
  if (dialectState.value?.pendingApproval?.value !== undefined) {
    return dialectState.value.pendingApproval.value;
  }
  return approval.pendingApproval.value;
});

const handleConfirm = () => {
  emit('confirmApproval');
  if (props.pendingApproval === undefined) {
    if (dialectState.value?.confirmPendingWrite) {
      void dialectState.value.confirmPendingWrite();
    } else {
      void approval.confirmPendingWrite();
    }
  }
};

const handleCancel = () => {
  emit('cancelApproval');
  if (props.pendingApproval === undefined) {
    if (dialectState.value?.cancelPendingWrite) {
      dialectState.value.cancelPendingWrite();
    } else {
      approval.cancelPendingWrite();
    }
  }
};

const documentsList = computed(
  () => props.documents ?? props.context?.formattedData ?? []
);

const getDocumentLabel = (document: Record<string, unknown>, index: number) =>
  document._id === undefined ? `Document ${index + 1}` : undefined;
</script>

<template>
  <div class="h-full w-full relative">
    <MongoRawQueryApprovalDialog
      :open="Boolean(activePendingApproval)"
      :loading="approval.isConfirming.value"
      :operations="activePendingApproval?.operations || []"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
    <BaseEmpty
      v-if="!documentsList.length"
      title="No Results"
      desc="The script returned no documents."
      class="h-full"
    />
    <MongoCollectionListView
      v-else
      :documents="documentsList as any"
      :is-read-only="true"
      :get-document-label="getDocumentLabel as any"
    />
  </div>
</template>
