import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoCollectionFilter from '~/components/modules/quick-query/mongodb/components/MongoCollectionFilter.vue';

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
});
