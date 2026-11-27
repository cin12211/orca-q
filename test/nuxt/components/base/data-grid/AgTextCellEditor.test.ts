import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AgTextCellEditor from '~/components/base/data-grid/components/AgTextCellEditor.vue';
import { parseBinaryInput } from '~/core/helpers/binary-value';

interface EditorVm {
  getValue: () => unknown;
  isCancelAfterEnd: () => boolean;
}

const bytes = (...data: number[]) => ({ type: 'Buffer', data });
const utf8 = (text: string) => bytes(...new TextEncoder().encode(text));

const textBlob = utf8('Xin chào\nOrcaQ 👋');
const imageBlob = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

const mountEditor = (value: unknown, valueKind?: 'text' | 'binary') => {
  const stopEditing = vi.fn();
  const wrapper = mount(AgTextCellEditor, {
    props: { params: { value, stopEditing, valueKind } as never },
    global: {
      stubs: {
        Button: {
          props: ['disabled', 'variant'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" :data-variant="variant" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
  const vm = wrapper.vm as unknown as EditorVm;
  const byTest = (id: string) => wrapper.find(`[data-test="${id}"]`);
  const textarea = () => byTest('text-editor-input');
  const draft = () => (textarea().element as HTMLTextAreaElement).value;
  const title = () => byTest('text-editor-title').text();
  const confirm = () => byTest('text-editor-confirm').trigger('click');
  const cancel = () => byTest('text-editor-cancel').trigger('click');
  const selectEncoding = (encoding: string) =>
    byTest(`text-editor-encoding-${encoding}`).trigger('click');

  return {
    wrapper,
    vm,
    stopEditing,
    byTest,
    textarea,
    draft,
    title,
    confirm,
    cancel,
    selectEncoding,
  };
};

/** The editor hands binary edits to the setter as 0x… hex. */
const confirmedBytes = (vm: EditorVm) =>
  parseBinaryInput(vm.getValue() as string);

describe('AgTextCellEditor - binary values are decoded for editing', () => {
  it('opens readable bytes as UTF-8 text', () => {
    const { draft, title, byTest } = mountEditor(textBlob, 'binary');

    expect(draft()).toBe('Xin chào\nOrcaQ 👋');
    expect(title()).toBe(`BINARY - ${textBlob.data.length} bytes`);
    expect(byTest('text-editor-encoding-utf8').attributes('data-variant')).toBe(
      'secondary'
    );
  });

  it('opens non-text bytes as hex', () => {
    const { draft, byTest } = mountEditor(imageBlob, 'binary');

    expect(draft()).toBe('0x89504e470d0a1a0a');
    expect(byTest('text-editor-encoding-hex').attributes('data-variant')).toBe(
      'secondary'
    );
  });

  it('encodes edited text back to UTF-8 bytes on confirm', async () => {
    const { vm, textarea, title, confirm, stopEditing } = mountEditor(
      textBlob,
      'binary'
    );

    await textarea().setValue('Tạm biệt');
    expect(title()).toBe(`BINARY - ${utf8('Tạm biệt').data.length} bytes`);
    await confirm();

    expect(stopEditing).toHaveBeenCalledTimes(1);
    expect(vm.isCancelAfterEnd()).toBe(false);
    expect(confirmedBytes(vm)).toEqual(utf8('Tạm biệt'));
  });

  it('confirming without changes returns the same bytes', async () => {
    const { vm, confirm } = mountEditor(textBlob, 'binary');

    await confirm();

    expect(confirmedBytes(vm)).toEqual(textBlob);
  });

  it('switches views without changing the bytes', async () => {
    const { vm, draft, selectEncoding, confirm } = mountEditor(
      textBlob,
      'binary'
    );

    await selectEncoding('hex');
    expect(draft()).toMatch(/^0x[0-9a-f]+$/);
    await selectEncoding('base64');
    expect(draft()).toBe(btoa(String.fromCharCode(...textBlob.data)));
    await selectEncoding('utf8');
    expect(draft()).toBe('Xin chào\nOrcaQ 👋');
    await confirm();

    expect(confirmedBytes(vm)).toEqual(textBlob);
  });

  it('edits in Base64 and saves the decoded bytes', async () => {
    const { vm, textarea, selectEncoding, confirm } = mountEditor(
      imageBlob,
      'binary'
    );

    await selectEncoding('base64');
    await textarea().setValue('3q2+7w==');
    await confirm();

    expect(confirmedBytes(vm)).toEqual(bytes(0xde, 0xad, 0xbe, 0xef));
  });

  it('refuses to show non-UTF-8 bytes as text', async () => {
    const { draft, byTest, selectEncoding } = mountEditor(imageBlob, 'binary');

    await selectEncoding('utf8');

    expect(draft()).toBe('0x89504e470d0a1a0a');
    expect(byTest('text-editor-error').text()).toContain('not valid UTF-8');
  });

  it('blocks confirming invalid hex or base64', async () => {
    const { vm, textarea, byTest, selectEncoding, confirm, stopEditing } =
      mountEditor(imageBlob, 'binary');

    await textarea().setValue('0x123');
    expect(byTest('text-editor-error').text()).toContain('Invalid hex');
    expect(byTest('text-editor-confirm').attributes('disabled')).toBeDefined();

    await textarea().setValue('0x00');
    await selectEncoding('base64');
    await textarea().setValue('abc$');
    expect(byTest('text-editor-error').text()).toContain('Invalid Base64');

    await confirm();
    expect(stopEditing).not.toHaveBeenCalled();
    expect(vm.getValue()).toStrictEqual(imageBlob);
  });

  it('a cleared text view is 0 bytes, Set NULL stores NULL', async () => {
    const empty = mountEditor(textBlob, 'binary');
    await empty.textarea().setValue('');
    expect(empty.title()).toBe('BINARY - 0 bytes');
    await empty.confirm();
    expect(confirmedBytes(empty.vm)).toEqual(bytes());

    const nulled = mountEditor(textBlob, 'binary');
    await nulled.byTest('text-editor-set-null').trigger('click');
    expect(nulled.title()).toBe('BINARY - NULL');
    await nulled.confirm();
    expect(nulled.vm.getValue()).toBeNull();
  });

  it('typing after Set NULL edits bytes again', async () => {
    const { vm, textarea, byTest, title, confirm } = mountEditor(
      imageBlob,
      'binary'
    );

    await byTest('text-editor-set-null').trigger('click');
    await textarea().setValue('0x01');
    expect(title()).toBe('BINARY - 1 byte');
    await confirm();

    expect(confirmedBytes(vm)).toEqual(bytes(1));
  });

  it('a NULL binary cell starts as NULL in hex view', () => {
    const { title, draft, byTest } = mountEditor(null, 'binary');

    expect(title()).toBe('BINARY - NULL');
    expect(draft()).toBe('');
    expect(byTest('text-editor-set-null').attributes('disabled')).toBeDefined();
  });

  it('keeps the original value when closed without confirming', async () => {
    const { vm, textarea, cancel, stopEditing } = mountEditor(
      textBlob,
      'binary'
    );

    await textarea().setValue('changed');
    await cancel();

    expect(stopEditing).toHaveBeenCalledTimes(1);
    expect(vm.isCancelAfterEnd()).toBe(true);
    expect(vm.getValue()).toStrictEqual(textBlob);
  });

  it('confirms with Ctrl/Cmd+Enter and cancels with Escape', async () => {
    const confirmed = mountEditor(imageBlob, 'binary');
    await confirmed.textarea().setValue('0x01');
    await confirmed
      .textarea()
      .trigger('keydown', { key: 'Enter', metaKey: true });
    expect(confirmedBytes(confirmed.vm)).toEqual(bytes(1));

    const cancelled = mountEditor(imageBlob, 'binary');
    await cancelled.textarea().setValue('0x01');
    await cancelled.textarea().trigger('keydown', { key: 'Escape' });
    expect(cancelled.stopEditing).toHaveBeenCalledTimes(1);
    expect(cancelled.vm.getValue()).toStrictEqual(imageBlob);
  });
});

describe('AgTextCellEditor - plain text', () => {
  it('edits text without encoding controls', async () => {
    const { vm, draft, textarea, byTest, confirm } = mountEditor('hello');

    expect(draft()).toBe('hello');
    expect(byTest('text-editor-encoding-hex').exists()).toBe(false);
    expect(byTest('text-editor-set-null').exists()).toBe(false);
    await textarea().setValue('not hex at all');
    await confirm();

    expect(vm.getValue()).toBe('not hex at all');
  });
});
