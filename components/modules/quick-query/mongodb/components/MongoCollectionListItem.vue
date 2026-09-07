<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { toast } from 'vue-sonner';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { MongoDocument } from '../types';

const props = defineProps<{
  document: MongoDocument;
  isExpanded: boolean;
  isEditing: boolean;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand'): void;
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save', updatedDoc: Record<string, unknown>): void;
  (e: 'resize'): void;
}>();

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

const onCopyDocument = () => {
  const jsonStr = JSON.stringify(props.document, null, 2);
  return handleCopyWithKey(props.document._id, jsonStr);
};

const formatDocumentJson = (doc: MongoDocument) => {
  return JSON.stringify(doc, null, 2);
};

const draftJson = ref(formatDocumentJson(props.document));

watch(
  () => props.document,
  newDoc => {
    if (!props.isEditing) {
      draftJson.value = formatDocumentJson(newDoc);
    }
  },
  { deep: true }
);

watch(
  () => props.isEditing,
  isEditing => {
    if (isEditing) {
      draftJson.value = formatDocumentJson(props.document);
    }
    nextTick(() => {
      emit('resize');
    });
  }
);

const isDirty = computed(() => {
  try {
    return draftJson.value.trim() !== formatDocumentJson(props.document).trim();
  } catch {
    return true;
  }
});

const editorExtensions = [json(), lintGutter(), linter(jsonParseLinter())];

const onCancel = () => {
  draftJson.value = formatDocumentJson(props.document);
  emit('cancel-edit');
};

const onSave = () => {
  try {
    const parsed = JSON.parse(draftJson.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error('Document must be a valid JSON object');
      return;
    }
    emit('save', parsed as Record<string, unknown>);
  } catch {
    toast.error('Invalid JSON syntax');
  }
};
</script>

<template>
  <div class="rounded-md border border-border/60 bg-card shadow-xs mb-2">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40 text-xs font-mono select-none"
    >
      <div class="flex items-center gap-2 font-medium">
        <Icon
          :name="isEditing ? 'hugeicons:pencil-edit-02' : 'hugeicons:files-01'"
          class="size-4!"
        />
        <span>_id: {{ document._id }}</span>
        <span
          v-if="isEditing"
          class="px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-sans font-medium"
        >
          Editing
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Edit Mode Actions -->
        <template v-if="isEditing">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-cancel-edit"
                :disabled="isSaving"
                @click="onCancel"
              >
                <Icon name="hugeicons:cancel-01" class="size-3.5!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancel changes</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip v-if="isDirty">
            <TooltipTrigger as-child>
              <Button
                variant="default"
                size="xs"
                class="h-6 gap-1 px-2 text-xs"
                data-testid="btn-save-document"
                :disabled="isSaving"
                @click="onSave"
              >
                <Icon
                  v-if="!isSaving"
                  name="hugeicons:floppy-disk"
                  class="size-3.5!"
                />
                <Icon
                  v-else
                  name="hugeicons:loading-03"
                  class="size-3.5! animate-spin"
                />
                <span>{{ isSaving ? 'Saving...' : 'Save' }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save changes to MongoDB</p>
            </TooltipContent>
          </Tooltip>
        </template>

        <!-- Read Mode Actions -->
        <template v-else>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-edit-document"
                @click="emit('start-edit')"
              >
                <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit document</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-toggle-expand"
                @click="emit('toggle-expand')"
              >
                <Icon
                  :name="
                    isExpanded
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
                  isExpanded ? 'Collapse nested keys' : 'Expand all nested keys'
                }}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="btn-copy-document"
                @click="onCopyDocument"
              >
                <Icon
                  :name="getCopyIcon(isCopied(document._id))"
                  :class="[
                    'size-3.5',
                    isCopied(document._id) && 'text-emerald-500 font-bold',
                  ]"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {{
                  getCopyTooltip(isCopied(document._id), 'Copy document JSON')
                }}
              </p>
            </TooltipContent>
          </Tooltip>
        </template>
      </div>
    </div>

    <!-- Body -->
    <div class="m-2 text-xs bg-background">
      <div
        v-if="isEditing"
        class="h-[260px] border border-border/50 rounded overflow-hidden"
      >
        <BaseCodeEditor
          v-model="draftJson"
          :extensions="editorExtensions"
          class="h-full"
        />
      </div>
      <div v-else class="overflow-x-auto">
        <VueJsonPretty
          :data="document"
          :deep="isExpanded ? 99 : 1"
          :show-double-quotes="true"
          :show-length="false"
          :show-line="false"
          :show-icon="true"
        />
      </div>
    </div>
  </div>
</template>
