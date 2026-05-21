import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuickQueryFilter from '~/components/modules/quick-query/quick-query-filter/QuickQueryFilter.vue';
import { ComposeOperator, EExtendedField, OperatorSet } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const { useHotkeysMock } = vi.hoisted(() => ({
  useHotkeysMock: vi.fn(),
}));

mockNuxtImport('useHotkeys', () => useHotkeysMock);

const TestInput = defineComponent({
  name: 'TestInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, expose }) {
    const inputRef = ref<HTMLInputElement | null>(null);

    expose({
      focus: () => inputRef.value?.focus(),
      el: inputRef,
    });

    return () =>
      h('input', {
        ...attrs,
        ref: inputRef,
        value: props.modelValue ?? '',
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      });
  },
});

const mountFilterHarness = () => {
  const FilterHarness = defineComponent({
    components: {
      QuickQueryFilter,
    },
    setup() {
      const filters = ref<
        Array<{
          isSelect?: boolean;
          fieldName: string;
          operator?: string;
          search?: string;
        }>
      >([]);
      const isShowFilters = ref(false);
      const filterRef = ref<InstanceType<typeof QuickQueryFilter>>();

      return {
        ComposeOperator,
        DatabaseClientType,
        filters,
        isShowFilters,
        filterRef,
      };
    },
    template: `
      <QuickQueryFilter
        ref="filterRef"
        :columns="['name', 'email']"
        :db-type="DatabaseClientType.POSTGRES"
        base-query='SELECT * FROM "public"."users"'
        :init-filters="filters"
        :compose-with="ComposeOperator.AND"
        :is-show-filters="isShowFilters"
        @update:is-show-filters="isShowFilters = $event"
        @on-update-filters="filters = $event"
      />
    `,
  });

  return mount(FilterHarness, {
    attachTo: document.body,
    global: {
      stubs: {
        Button: true,
        Checkbox: true,
        ColumnSelector: true,
        Icon: true,
        Input: TestInput,
        OperatorSelector: true,
        Tooltip: true,
        TooltipContent: true,
        TooltipTrigger: true,
      },
    },
  });
};

vi.mock(
  '~/components/modules/quick-query/quick-query-filter/QuickQueryFilterGuide.vue',
  async () => {
    const { defineComponent, h } = await import('vue');

    return {
      default: defineComponent({
        name: 'QuickQueryFilterGuide',
        props: {
          getParserApplyFilter: {
            type: Function,
            required: true,
          },
          getParserAllFilter: {
            type: Function,
            required: true,
          },
          composeWith: {
            type: String,
            required: true,
          },
        },
        setup(props) {
          return () =>
            h('div', { 'data-test': 'guide' }, [
              props.composeWith,
              props.getParserApplyFilter(),
              props.getParserAllFilter(),
            ]);
        },
      }),
    };
  }
);

const mountFilter = (
  props: Partial<InstanceType<typeof QuickQueryFilter>['$props']> = {}
) => {
  return mount(QuickQueryFilter, {
    attachTo: document.body,
    props: {
      columns: ['name', 'email'],
      dbType: DatabaseClientType.POSTGRES,
      baseQuery: 'SELECT * FROM "public"."users"',
      initFilters: [
        {
          isSelect: true,
          fieldName: 'name',
          operator: OperatorSet.EQUAL,
          search: 'alice',
        },
        {
          isSelect: true,
          fieldName: 'email',
          operator: OperatorSet.EQUAL,
          search: 'bob@example.com',
        },
      ],
      composeWith: ComposeOperator.AND,
      isShowFilters: true,
      ...props,
    },
    global: {
      stubs: {
        Button: true,
        Checkbox: true,
        ColumnSelector: true,
        Icon: true,
        Input: TestInput,
        OperatorSelector: true,
        Tooltip: true,
        TooltipContent: true,
        TooltipTrigger: true,
      },
    },
  });
};

describe('QuickQueryFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates preview SQL when composeWith changes', async () => {
    const wrapper = mountFilter();

    const andPreview = wrapper.get('[data-test="guide"]').text();

    expect(andPreview).toContain(ComposeOperator.AND);
    expect(andPreview).toContain(
      `SELECT * FROM "public"."users" WHERE "name" = 'alice' AND "email" = 'bob@example.com';`
    );

    await wrapper.setProps({
      composeWith: ComposeOperator.OR,
    });

    const orPreview = wrapper.get('[data-test="guide"]').text();

    expect(orPreview).toContain(ComposeOperator.OR);
    expect(orPreview).toContain(
      `SELECT * FROM "public"."users" WHERE "name" = 'alice' OR "email" = 'bob@example.com';`
    );
  });

  it('focuses the first filter value input when showing filters', async () => {
    const wrapper = mountFilterHarness();
    const filter = wrapper.getComponent(QuickQueryFilter);
    const exposed = filter.vm as unknown as {
      onShowSearch: () => Promise<void>;
    };

    await exposed.onShowSearch();
    await nextTick();
    await nextTick();

    const input = filter.get('input');
    const state = wrapper.vm as unknown as {
      filters: Array<{
        isSelect?: boolean;
        fieldName: string;
        operator?: string;
      }>;
    };

    expect(state.filters).toEqual([
      {
        isSelect: true,
        fieldName: EExtendedField.AnyField,
        operator: OperatorSet.LIKE_CONTAINS,
      },
    ]);
    expect(document.activeElement).toBe(input.element);
  });
});
