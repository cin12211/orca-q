import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoViewModeSwitcher from '~/components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue';
import { MongoCollectionViewMode } from '~/components/modules/quick-query/mongodb/types';

describe('MongoViewModeSwitcher', () => {
  it('emits update:modelValue with the clicked mode', async () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: MongoCollectionViewMode.Table },
    });

    await wrapper
      .get('[data-testid="mongo-view-mode-list"]')
      .trigger('mousedown', { button: 0 });

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      MongoCollectionViewMode.List,
    ]);
  });

  it('marks the active mode tab as selected', () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: MongoCollectionViewMode.Info },
    });

    expect(
      wrapper
        .get('[data-testid="mongo-view-mode-info"]')
        .attributes('aria-selected')
    ).toBe('true');
  });
});
