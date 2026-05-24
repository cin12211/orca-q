import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AgJsonCellEditor from '~/components/base/data-grid/components/AgJsonCellEditor.vue';

const mountComponent = (value: unknown) => {
  const stopEditing = vi.fn();

  const wrapper = mount(AgJsonCellEditor, {
    props: {
      params: {
        value,
        stopEditing,
      },
    },
    global: {
      stubs: {
        JsonEditorVue: {
          props: ['modelValue'],
          emits: ['update:modelValue', 'modeChange'],
          template: '<div data-test="json-editor" />',
        },
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

  return { wrapper, stopEditing };
};

describe('AgJsonCellEditor', () => {
  it('preserves array values instead of spreading them into indexed objects', async () => {
    const { wrapper, stopEditing } = mountComponent(['a', 'b', 'c']);

    await wrapper.findAll('button')[1]?.trigger('click');

    expect(stopEditing).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as { getValue: () => string }).getValue()).toBe(
      '["a","b","c"]'
    );
  });

  it('parses stringified json arrays and saves them back as arrays', async () => {
    const { wrapper } = mountComponent('["a","b","c"]');

    await wrapper.findAll('button')[1]?.trigger('click');

    expect((wrapper.vm as { getValue: () => string }).getValue()).toBe(
      '["a","b","c"]'
    );
  });
});
