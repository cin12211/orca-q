import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoViewModeSwitcher from '~/components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue';

describe('MongoViewModeSwitcher', () => {
  it('emits update:modelValue with the clicked mode', async () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: 'table' },
    });

    await wrapper
      .get('[data-testid="mongo-view-mode-list"]')
      .trigger('mousedown', { button: 0 });

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['list']);
  });

  it('marks the active mode tab as selected', () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: 'object-list' },
    });

    expect(
      wrapper
        .get('[data-testid="mongo-view-mode-object-list"]')
        .attributes('aria-selected')
    ).toBe('true');
  });
});
