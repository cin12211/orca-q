<script setup lang="ts">
import { computed, onMounted, ref, toRaw, useTemplateRef } from 'vue';
import { Button } from '#components';
import type { ICellEditorParams } from 'ag-grid-community';
import {
  BINARY_TEXT_ENCODING_LABELS,
  BinaryTextEncoding,
  decodeBinaryText,
  detectBinaryTextEncoding,
  encodeBinaryText,
} from '~/core/helpers/binary-codec';
import {
  formatBinarySummary,
  formatBinaryValue,
  isSerializedBinaryValue,
  type SerializedBinaryValue,
} from '~/core/helpers/binary-value';

/**
 * Popup text editor with explicit confirm/cancel, the plain-text sibling of
 * `AgJsonCellEditor`.
 *
 * Binary cells (the grid only shows `BINARY - n bytes`) are decoded for the
 * user: UTF-8 text when the bytes are readable text, hex otherwise, with
 * Base64 as a third view. On confirm the edited text is encoded back to the
 * exact bytes and handed to the column `valueSetter` as `0x…` hex, so the
 * save path is the same whatever view the user edited in.
 *
 * Outside the grid (e.g. the row preview sidebar) it can be embedded as a
 * read-only viewer: pass `value` and `readonly` instead of AG Grid `params`.
 */
export type AgTextCellEditorValueKind = 'text' | 'binary';

export interface AgTextCellEditorParams {
  valueKind?: AgTextCellEditorValueKind;
}

const props = defineProps<{
  /** AG Grid cell editor params; absent when embedded outside the grid. */
  params?: ICellEditorParams & AgTextCellEditorParams;
  /** Value to show when embedded outside the grid. */
  value?: unknown;
  valueKind?: AgTextCellEditorValueKind;
  /** View-only: no editing, no Set NULL / Cancel / Oke. */
  readonly?: boolean;
}>();

const ENCODING_OPTIONS = Object.values(BinaryTextEncoding);

const ENCODING_ERRORS: Record<BinaryTextEncoding, string> = {
  [BinaryTextEncoding.Utf8]: 'These bytes are not valid UTF-8 text.',
  [BinaryTextEncoding.Hex]:
    'Invalid hex: use 0x followed by pairs of hex digits (0-9, a-f).',
  [BinaryTextEncoding.Base64]:
    'Invalid Base64: use A-Z, a-z, 0-9, + and /, padded with = to a multiple of 4.',
};

const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef');

const originalValue = toRaw(
  props.params ? props.params.value : props.value
) as unknown;
const originalBinary = isSerializedBinaryValue(originalValue)
  ? originalValue
  : undefined;
const isBinary =
  (props.params?.valueKind ?? props.valueKind) === 'binary' ||
  originalBinary !== undefined;

const encoding = ref<BinaryTextEncoding>(
  originalBinary
    ? detectBinaryTextEncoding(originalBinary)
    : BinaryTextEncoding.Hex
);

const toInitialText = () => {
  if (originalBinary) {
    return decodeBinaryText(originalBinary, encoding.value) ?? '';
  }
  if (originalValue === null || originalValue === undefined) return '';
  return String(originalValue);
};

const initialText = toInitialText();
const draft = ref(initialText);
const isNull = ref(isBinary && originalValue === null);
const switchError = ref<string>();

let confirmed = false;

/** Bytes the current draft encodes to; `undefined` when the draft is invalid. */
const encodedBinary = computed<SerializedBinaryValue | undefined>(() =>
  isBinary ? encodeBinaryText(draft.value, encoding.value) : undefined
);

const errorMessage = computed(() => {
  if (!isBinary || isNull.value) return undefined;
  if (switchError.value) return switchError.value;
  return encodedBinary.value ? undefined : ENCODING_ERRORS[encoding.value];
});

const isDraftInvalid = computed(
  () => isBinary && !isNull.value && !encodedBinary.value
);

const title = computed(() => {
  if (!isBinary) return 'Text';
  if (isNull.value) return 'BINARY - NULL';
  return encodedBinary.value
    ? formatBinarySummary(encodedBinary.value)
    : 'BINARY';
});

const onDraftInput = () => {
  isNull.value = false;
  switchError.value = undefined;
};

/** Re-render the same bytes in another encoding; refuses lossy switches. */
const onSelectEncoding = (next: BinaryTextEncoding) => {
  if (next === encoding.value) return;

  const bytes = isNull.value ? undefined : encodedBinary.value;
  if (!isNull.value && !bytes) return;

  const nextText = bytes ? decodeBinaryText(bytes, next) : '';
  if (nextText === undefined) {
    switchError.value = ENCODING_ERRORS[next];
    return;
  }

  switchError.value = undefined;
  encoding.value = next;
  draft.value = nextText;
};

const onSetNull = () => {
  isNull.value = true;
  switchError.value = undefined;
  draft.value = '';
};

const onConfirm = () => {
  if (props.readonly || isDraftInvalid.value) return;
  confirmed = true;
  props.params?.stopEditing();
};

const onCancel = () => {
  confirmed = false;
  props.params?.stopEditing();
};

// Keep keys inside the editor: AG Grid would otherwise treat Enter / arrows
// as grid navigation and stop editing mid-typing.
const onKeydown = (event: KeyboardEvent) => {
  event.stopPropagation();

  if (event.key === 'Escape') {
    event.preventDefault();
    onCancel();
    return;
  }

  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    onConfirm();
  }
};

// Unconfirmed edits (blur, click outside, Esc) hand back the original value,
// so opening the editor can never rewrite the cell.
function getValue(): unknown {
  if (!confirmed) return originalValue;

  if (!isBinary) {
    return draft.value === initialText ? originalValue : draft.value;
  }

  if (isNull.value) return null;

  // Unchanged bytes come back as the same `0x…` text the setter compares
  // against, so a confirm without real changes is a no-op.
  return encodedBinary.value
    ? formatBinaryValue(encodedBinary.value)
    : originalValue;
}

function isCancelAfterEnd(): boolean {
  return !confirmed;
}

function isCancelBeforeStart(): boolean {
  return false;
}

function afterGuiAttached(): void {
  if (props.params) textareaRef.value?.focus();
}

onMounted(afterGuiAttached);

defineExpose({
  getValue,
  isCancelAfterEnd,
  isCancelBeforeStart,
  afterGuiAttached,
});
</script>

<template>
  <div
    :class="[
      'bg-background border rounded-md flex flex-col',
      props.params ? 'w-[35rem] resize overflow-auto' : 'w-full',
    ]"
    :tabindex="props.params ? 0 : undefined"
    @keydown="props.params ? onKeydown($event) : undefined"
  >
    <div
      class="flex items-center justify-between gap-2 px-2 py-1 border-b text-xs text-muted-foreground"
    >
      <span data-test="text-editor-title" class="font-medium">{{ title }}</span>

      <div v-if="isBinary" class="flex items-center gap-0.5">
        <Button
          v-for="option in ENCODING_OPTIONS"
          :key="option"
          :data-test="`text-editor-encoding-${option}`"
          :variant="option === encoding ? 'secondary' : 'ghost'"
          size="xxs"
          @click="onSelectEncoding(option)"
        >
          {{ BINARY_TEXT_ENCODING_LABELS[option] }}
        </Button>
      </div>
    </div>

    <textarea
      ref="textareaRef"
      v-model="draft"
      data-test="text-editor-input"
      :class="[
        'flex-1 w-full resize-none bg-transparent p-2 text-xs outline-none',
        props.params ? 'min-h-40' : 'min-h-24',
        isBinary && encoding !== BinaryTextEncoding.Utf8
          ? 'font-mono break-all'
          : 'whitespace-pre-wrap',
      ]"
      :placeholder="isNull ? 'NULL' : undefined"
      :readonly="props.readonly"
      spellcheck="false"
      :aria-invalid="!!errorMessage"
      @input="onDraftInput"
    />

    <p
      v-if="errorMessage"
      data-test="text-editor-error"
      class="px-2 pb-1 text-xs text-destructive"
    >
      {{ errorMessage }}
    </p>

    <div
      v-if="!props.readonly"
      class="flex items-center justify-between gap-1 p-2 border-t"
    >
      <Button
        v-if="isBinary"
        data-test="text-editor-set-null"
        variant="ghost"
        size="xxs"
        :disabled="isNull"
        @click="onSetNull"
      >
        Set NULL
      </Button>
      <span v-else />

      <div class="flex gap-1">
        <Button
          data-test="text-editor-cancel"
          variant="outline"
          size="xxs"
          @click="onCancel"
        >
          Cancel
        </Button>
        <Button
          data-test="text-editor-confirm"
          :disabled="isDraftInvalid"
          size="xxs"
          @click="onConfirm"
        >
          Oke
        </Button>
      </div>
    </div>
  </div>
</template>
