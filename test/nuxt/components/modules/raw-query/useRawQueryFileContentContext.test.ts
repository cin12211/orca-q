import { computed, defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  provideRawQueryFileContent,
  useRawQueryFileContentContext,
} from '~/components/modules/raw-query/hooks';
import type { RawQueryFileContent } from '~/components/modules/raw-query/hooks';

const { fileContentMock } = vi.hoisted(() => ({
  fileContentMock: vi.fn(),
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

const connections = [
  { id: 'conn-1', name: 'One' },
  { id: 'conn-2', name: 'Two' },
];

const createFileContent = () => {
  const selectedConnectionId = ref('conn-1');

  return {
    fieldDefs: ref([]),
    fileContents: ref(''),
    fileVariables: ref(''),
    currentFile: ref(undefined),
    selectedConnectionId,
    updateSelectedConnection: (connectionId: string) => {
      selectedConnectionId.value = connectionId;
    },
    updateFileContent: vi.fn(),
    updateFileVariables: vi.fn(),
    connection: computed(() =>
      connections.find(item => item.id === selectedConnectionId.value)
    ),
    currentOpenedConnection: ref(undefined),
    connectionsByWsId: ref(connections),
    updateFileCursorPos: vi.fn(),
    loadFileContent: vi.fn().mockResolvedValue(undefined),
    isFromCache: true,
  };
};

const createChild = (collect: (instance: RawQueryFileContent) => void) =>
  defineComponent({
    setup() {
      collect(useRawQueryFileContentContext());
      return () => h('div');
    },
  });

describe('useRawQueryFileContentContext', () => {
  beforeEach(() => {
    fileContentMock.mockReset();
    fileContentMock.mockImplementation(createFileContent);
  });

  it('gives every child the instance provided by the parent', () => {
    const collected: RawQueryFileContent[] = [];
    const Child = createChild(instance => collected.push(instance));

    let provided: RawQueryFileContent | undefined;
    const Parent = defineComponent({
      setup() {
        provided = provideRawQueryFileContent();
        return () => h('div', [h(Child), h(Child)]);
      },
    });

    mount(Parent);

    expect(fileContentMock).toHaveBeenCalledTimes(1);
    expect(collected).toHaveLength(2);
    expect(collected[0]).toBe(provided);
    expect(collected[1]).toBe(provided);
  });

  it('propagates a connection change made through one consumer to the others', () => {
    const collected: RawQueryFileContent[] = [];
    const Child = createChild(instance => collected.push(instance));

    const Parent = defineComponent({
      setup() {
        provideRawQueryFileContent();
        return () => h('div', [h(Child), h(Child)]);
      },
    });

    mount(Parent);

    const [first, second] = collected as [
      RawQueryFileContent,
      RawQueryFileContent,
    ];

    expect(second.connection.value?.id).toBe('conn-1');

    first.updateSelectedConnection('conn-2');

    expect(second.selectedConnectionId.value).toBe('conn-2');
    expect(second.connection.value?.id).toBe('conn-2');
  });

  it('accepts an instance supplied by the caller', () => {
    const instance = createFileContent() as unknown as RawQueryFileContent;
    const collected: RawQueryFileContent[] = [];
    const Child = createChild(value => collected.push(value));

    const Parent = defineComponent({
      setup() {
        provideRawQueryFileContent(instance);
        return () => h('div', [h(Child)]);
      },
    });

    mount(Parent);

    expect(fileContentMock).not.toHaveBeenCalled();
    expect(collected[0]).toBe(instance);
  });

  it('falls back to its own instance when no parent provided one', () => {
    const collected: RawQueryFileContent[] = [];
    const Child = createChild(instance => collected.push(instance));

    const Parent = defineComponent({
      setup: () => () => h('div', [h(Child), h(Child)]),
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mount(Parent);

    expect(collected).toHaveLength(2);
    expect(collected[0]).not.toBe(collected[1]);
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });
});
