import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import {
  provideRawQueryResultTabs,
  useRawQueryResultTabsContext,
} from '~/components/modules/raw-query/hooks';
import type { ResultTabsReturn } from '~/components/modules/raw-query/hooks';
import type { ExecutedResultItem } from '~/components/modules/raw-query/interfaces';
import { ViewMode } from '~/components/modules/raw-query/interfaces';

const createTab = (id: string): ExecutedResultItem =>
  ({
    id,
    metadata: {
      queryTime: 1,
      statementQuery: 'SELECT 1',
      executedAt: 0,
    },
    result: undefined,
    view: ViewMode.RESULT,
  }) as unknown as ExecutedResultItem;

const createConsumer = (collect: (instance: ResultTabsReturn) => void) =>
  defineComponent({
    setup() {
      collect(useRawQueryResultTabsContext());
      return () => h('div');
    },
  });

describe('useRawQueryResultTabsContext', () => {
  it('keeps the result tabs when the parent swaps the engine entry component', async () => {
    const collected: ResultTabsReturn[] = [];
    const ChildA = createConsumer(instance => collected.push(instance));
    const ChildB = createConsumer(instance => collected.push(instance));

    const Parent = defineComponent({
      setup() {
        provideRawQueryResultTabs();
        const entry = shallowRef(ChildA);
        return { entry };
      },
      render() {
        return h(this.entry, { key: this.entry === ChildA ? 'a' : 'b' });
      },
    });

    const wrapper = mount(Parent);

    const [childA] = collected as [ResultTabsReturn];
    childA.addResultTab(createTab('query-1'));

    expect(childA.executedResults.value.size).toBe(1);

    wrapper.vm.entry = ChildB;
    await nextTick();

    expect(collected).toHaveLength(2);
    const childB = collected[1] as ResultTabsReturn;

    expect(childB).toBe(childA);
    expect(childB.executedResults.value.size).toBe(1);
    expect(childB.activeResultTabId.value).toBe('query-1');
  });

  it('falls back to its own instance when no parent provided one', () => {
    const collected: ResultTabsReturn[] = [];
    const Child = createConsumer(instance => collected.push(instance));

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

  it('accepts an instance supplied by the caller', () => {
    const collected: ResultTabsReturn[] = [];
    const Child = createConsumer(instance => collected.push(instance));

    let provided: ResultTabsReturn | undefined;
    const Parent = defineComponent({
      setup() {
        provided = provideRawQueryResultTabs();
        return () => h('div', [h(Child), h(Child)]);
      },
    });

    mount(Parent);

    expect(collected[0]).toBe(provided);
    expect(collected[1]).toBe(provided);
  });
});
