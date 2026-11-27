import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MongoCollectionFilter from '~/components/modules/mongodb-workspace/components/MongoCollectionFilter.vue';
import MongoColumnSelector from '~/components/modules/mongodb-workspace/components/MongoColumnSelector.vue';
import { getPlatformStorage } from '~/core/persist/storage-adapter';

const defaultProps = {
  documents: [{ _id: '1', name: 'Product A' }],
  isShowFilters: true,
};

const mountFilter = (props: Record<string, unknown> = {}) =>
  mount(MongoCollectionFilter, {
    props: {
      ...defaultProps,
      ...props,
    },
    global: {
      stubs: {
        Tooltip: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipProvider: { template: '<div><slot /></div>' },
        BaseCodeEditor: { template: '<div class="stub-code-editor" />' },
      },
    },
  });

describe('MongoCollectionFilter', () => {
  it('renders Apply Filter and Reset buttons in Visual mode', () => {
    const wrapper = mountFilter();

    const buttons = wrapper.findAll('button');
    const resetBtn = buttons.find(b => b.text().trim() === 'Reset');
    const applyBtn = buttons.find(b => b.text().includes('Apply Filter'));

    expect(resetBtn).toBeDefined();
    expect(applyBtn).toBeDefined();
  });

  it('resets filter and emits applyFilter with undefined when Reset is clicked', async () => {
    const wrapper = mountFilter();

    const buttons = wrapper.findAll('button');
    const resetBtn = buttons.find(b => b.text().trim() === 'Reset');
    expect(resetBtn).toBeDefined();

    await resetBtn!.trigger('click');

    const emitted = wrapper.emitted('applyFilter');
    expect(emitted).toBeTruthy();
    expect(emitted![emitted!.length - 1][0]).toBeUndefined();
  });

  it('applies filter when Apply Filter is clicked', async () => {
    const wrapper = mountFilter();

    const buttons = wrapper.findAll('button');
    const applyBtn = buttons.find(b => b.text().includes('Apply Filter'));
    expect(applyBtn).toBeDefined();

    await applyBtn!.trigger('click');

    const emitted = wrapper.emitted('applyFilter');
    expect(emitted).toBeTruthy();
  });

  it('renders MongoQueryMoreOptions when isShowMoreOptions is true and applies both filter and options', async () => {
    const wrapper = mountFilter({ isShowMoreOptions: true });

    const moreOptions = wrapper.findComponent({
      name: 'MongoQueryMoreOptions',
    });
    expect(moreOptions.exists()).toBe(true);

    const sortInput = wrapper.find<HTMLInputElement>('input#more-sort');
    await sortInput.setValue('{"createdAt": -1}');

    const applyBtn = wrapper
      .findAll('button')
      .find(b => b.text().includes('Apply Filter'));
    await applyBtn!.trigger('click');

    const emitted = wrapper.emitted('applyFilter');
    expect(emitted).toBeTruthy();
    expect(emitted![emitted!.length - 1][1]).toEqual({
      sort: { createdAt: -1 },
    });
  });

  it('resets both filter and more options when Reset is clicked', async () => {
    const wrapper = mountFilter({ isShowMoreOptions: true });

    const sortInput = wrapper.find<HTMLInputElement>('input#more-sort');
    await sortInput.setValue('{"createdAt": -1}');

    const resetBtn = wrapper
      .findAll('button')
      .find(b => b.text().trim() === 'Reset');
    await resetBtn!.trigger('click');

    expect(sortInput.element.value).toBe('');
    const emitted = wrapper.emitted('applyFilter');
    expect(emitted).toBeTruthy();
    expect(emitted![emitted!.length - 1]).toEqual([undefined, {}]);
  });

  it('does not render MongoQueryMoreOptions when isShowMoreOptions is false', () => {
    const wrapper = mountFilter({ isShowMoreOptions: false });

    const moreOptions = wrapper.findComponent({
      name: 'MongoQueryMoreOptions',
    });
    expect(moreOptions.exists()).toBe(false);
  });

  describe('field selectors when the filter matches no documents', () => {
    const PERSIST_KEY = 'test-mongo-filter-known-fields';
    const documents = [
      { _id: '1', name: 'Product A', price: 10, meta: { color: 'red' } },
    ];
    const expectedFields = ['_id', 'meta', 'meta.color', 'name', 'price'];

    const selectorColumns = (wrapper: ReturnType<typeof mountFilter>) =>
      wrapper.findComponent(MongoColumnSelector).props('columns');

    afterEach(() => {
      getPlatformStorage().removeItem(PERSIST_KEY);
    });

    it('keeps the known fields after the result becomes empty', async () => {
      const wrapper = mountFilter({ documents });
      expect(selectorColumns(wrapper)).toEqual(expectedFields);

      await wrapper.setProps({ documents: [] });

      expect(selectorColumns(wrapper)).toEqual(expectedFields);
    });

    it('adds fields from later pages without dropping earlier ones', async () => {
      const wrapper = mountFilter({ documents });

      await wrapper.setProps({ documents: [{ _id: '2', stock: 3 }] });

      expect(selectorColumns(wrapper)).toEqual([...expectedFields, 'stock']);
    });

    it('restores known fields when remounted on an empty result', async () => {
      const first = mountFilter({ documents, persistKey: PERSIST_KEY });
      // Persistence is debounced by DEFAULT_DEBOUNCE_INPUT.
      await vi.waitFor(() => {
        const persisted = getPlatformStorage().getItem(PERSIST_KEY);
        expect(JSON.parse(persisted ?? '{}').knownFields).toEqual(
          expectedFields
        );
      });
      first.unmount();

      const second = mountFilter({ documents: [], persistKey: PERSIST_KEY });
      await flushPromises();

      expect(selectorColumns(second)).toEqual(expectedFields);
    });
  });
});
