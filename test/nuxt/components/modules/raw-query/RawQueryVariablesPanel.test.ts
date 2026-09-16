import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import RawQueryVariablesPanel from '~/components/modules/raw-query/components/layout/RawQueryVariablesPanel.vue';
import { RAW_QUERY_CONTEXT_KEY } from '~/components/modules/raw-query/hooks';

describe('RawQueryVariablesPanel', () => {
  it('renders BaseEmpty when variables are not supported in context', async () => {
    const mockContext = {
      isVariableSupported: ref(false),
      fileVariables: ref('{}'),
      onUpdateFileVariables: vi.fn(),
    };

    const wrapper = mount(RawQueryVariablesPanel, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: mockContext,
        },
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Variables not supported');
    expect(wrapper.text()).toContain(
      'Variables are not available for Redis and SQLite connections.'
    );
  });

  it('renders VariableEditor when variables are supported in context', async () => {
    const mockContext = {
      isVariableSupported: ref(true),
      fileVariables: ref('{"limit": 10}'),
      onUpdateFileVariables: vi.fn(),
    };

    const wrapper = mount(RawQueryVariablesPanel, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: mockContext,
        },
      },
    });

    await flushPromises();
    expect(wrapper.text()).not.toContain('Variables not supported');
    const editor = wrapper.findComponent({ name: 'VariableEditor' });
    expect(editor.exists()).toBe(true);
    expect(editor.props('fileVariables')).toBe('{"limit": 10}');
  });

  it('calls onUpdateFileVariables when VariableEditor emits updateVariables', async () => {
    const onUpdateFileVariables = vi.fn();
    const mockContext = {
      isVariableSupported: ref(true),
      fileVariables: ref('{"foo": "bar"}'),
      onUpdateFileVariables,
    };

    const wrapper = mount(RawQueryVariablesPanel, {
      global: {
        provide: {
          [RAW_QUERY_CONTEXT_KEY as symbol]: mockContext,
        },
      },
    });

    await flushPromises();
    const editor = wrapper.findComponent({ name: 'VariableEditor' });
    expect(editor.exists()).toBe(true);

    editor.vm.$emit('updateVariables', '{"foo": "baz"}');
    await flushPromises();

    expect(onUpdateFileVariables).toHaveBeenCalledWith('{"foo": "baz"}');
  });
});
