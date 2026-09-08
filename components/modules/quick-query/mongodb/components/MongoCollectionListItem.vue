<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  Button,
  ContextMenuShortcut,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { keymap } from '@codemirror/view';
import VueJsonPretty from 'vue-json-pretty';
import { toast } from 'vue-sonner';
import { cn } from '@/lib/utils';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { currentStatementLineGutterExtension } from '~/components/base/code-editor/extensions';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { useVueJsonPrettyTheme } from '~/core/composables/useVueJsonPrettyTheme';
import type { MongoDocument } from '../types';

const props = withDefaults(
  defineProps<{
    document: MongoDocument;
    isExpanded: boolean;
    isEditing: boolean;
    isSaving: boolean;
    isDeleting?: boolean;
  }>(),
  {
    isDeleting: false,
  }
);

const emit = defineEmits<{
  (e: 'toggle-expand'): void;
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save', updatedDoc: Record<string, unknown>): void;
  (e: 'delete'): void;
  (e: 'resize'): void;
}>();

const { handleCopyWithKey, isCopied, getCopyIcon, getCopyTooltip } =
  useCopyToClipboard();

const { themeMode, themeClass } = useVueJsonPrettyTheme();

const onCopyDocument = () => {
  const jsonStr = JSON.stringify(props.document, null, 2);
  return handleCopyWithKey(props.document._id, jsonStr);
};

const formatDocumentJson = (doc: MongoDocument) => {
  return JSON.stringify(doc, null, 2);
};

const draftJson = ref(formatDocumentJson(props.document));
const editorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
const isFullscreen = ref(false);

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  nextTick(() => {
    emit('resize');
  });
};

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

const onCancel = () => {
  draftJson.value = formatDocumentJson(props.document);
  emit('cancel-edit');
};

const onDiscard = () => {
  draftJson.value = formatDocumentJson(props.document);
  editorRef.value?.setContent(draftJson.value);
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

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false;
    nextTick(() => {
      emit('resize');
    });
    return;
  }

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    if (props.isEditing && isDirty.value && !props.isSaving) {
      e.preventDefault();
      onSave();
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const editorExtensions = [
  json(),
  lintGutter(),
  linter(jsonParseLinter()),
  currentStatementLineGutterExtension,
  keymap.of([
    {
      key: 'Mod-s',
      run: () => {
        if (isDirty.value && !props.isSaving) {
          onSave();
        }
        return true;
      },
    },
  ]),
];
</script>

<template>
  <Teleport to="body" :disabled="!isFullscreen">
    <div
      :class="
        cn(
          'rounded-md border border-border/60 bg-card shadow-xs mb-2 transition-all duration-200',
          isFullscreen
            ? 'fixed inset-0 z-[999] p-4 bg-background flex flex-col h-screen w-screen m-0 rounded-none border-0'
            : ''
        )
      "
      data-testid="mongo-collection-list-item"
    >
      <!-- Header -->
      <div
        :class="
          cn(
            'flex items-center justify-between px-3 py-1 bg-muted/50 border-b border-border/40 text-xs select-none flex-shrink-0',
            isFullscreen ? 'rounded-t border' : ''
          )
        "
      >
        <div class="flex items-center gap-2 font-medium">
          <Icon
            :name="
              isEditing ? 'hugeicons:pencil-edit-02' : 'hugeicons:files-01'
            "
            class="size-4!"
          />
          <span>_id: {{ document._id }}</span>
        </div>

        <div class="flex items-center gap-1">
          <!-- Edit Mode Actions -->
          <template v-if="isEditing">
            <Tooltip v-if="isDirty">
              <TooltipTrigger as-child>
                <Button
                  variant="outline"
                  size="xxs"
                  class="relative overflow-visible"
                  data-testid="btn-save-document"
                  :disabled="isSaving"
                  @click="onSave"
                >
                  <Icon v-if="!isSaving" name="lucide:save" class="size-3.5!" />
                  <Icon
                    v-else
                    name="hugeicons:loading-03"
                    class="size-3.5! animate-spin"
                  />
                  <ContextMenuShortcut>⌘S</ContextMenuShortcut>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save changes</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip v-if="isDirty">
              <TooltipTrigger as-child>
                <Button
                  variant="outline"
                  size="xxs"
                  class="font-normal"
                  data-testid="btn-discard-document"
                  :disabled="isSaving"
                  @click="onDiscard"
                >
                  <Icon name="hugeicons:undo-02"> </Icon>
                  Discard
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Discard changes</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="iconSm"
                  data-testid="btn-cancel-edit"
                  :disabled="isSaving"
                  @click="onCancel"
                >
                  <Icon name="hugeicons:cancel-01" class="size-3.5!" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancel edit</p>
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
                    isExpanded
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

            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="iconSm"
                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  data-testid="btn-delete-document"
                  :disabled="isSaving || isDeleting"
                  @click="emit('delete')"
                >
                  <Icon
                    v-if="!isDeleting"
                    name="hugeicons:delete-02"
                    class="size-3.5!"
                  />
                  <Icon
                    v-else
                    name="hugeicons:loading-03"
                    class="size-3.5! animate-spin"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete document</p>
              </TooltipContent>
            </Tooltip>
          </template>

          <!-- Fullscreen Zoom Toggle -->
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="iconSm"
                data-testid="btn-toggle-fullscreen"
                @click="toggleFullscreen"
              >
                <Icon
                  :name="
                    isFullscreen
                      ? 'hugeicons:minimize-screen'
                      : 'hugeicons:full-screen'
                  "
                  class="size-3.5!"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="end" side="top">
              {{
                isFullscreen
                  ? 'Zoom In (Restore Normal)'
                  : 'Zoom Out (Full Screen)'
              }}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <!-- Body -->
      <div
        :class="
          cn(
            'text-xs bg-background',
            isFullscreen
              ? 'flex-1 overflow-hidden flex flex-col min-h-0 border border-t-0 border-border/40 rounded-b p-2'
              : ''
          )
        "
      >
        <div
          v-if="isEditing"
          :class="
            cn(
              'border border-border/50 rounded overflow-hidden',
              isFullscreen ? 'flex-1 h-full' : 'h-[260px]'
            )
          "
        >
          <BaseCodeEditor
            ref="editorRef"
            v-model="draftJson"
            :extensions="editorExtensions"
            class="h-full"
          />
        </div>
        <div
          v-else
          :class="
            cn(
              'overflow-x-auto m-2',
              isFullscreen ? 'flex-1 h-full overflow-auto m-0' : ''
            )
          "
        >
          <VueJsonPretty
            :data="document"
            :deep="isExpanded || isFullscreen ? 99 : 1"
            :show-double-quotes="true"
            :show-length="false"
            :show-line="false"
            :show-icon="true"
            :theme="themeMode"
            :class="themeClass"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
