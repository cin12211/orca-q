import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickQueryFilter from '~/components/modules/quick-query/quick-query-filter/QuickQueryFilter.vue';
import { ComposeOperator, OperatorSet } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const { useHotkeysMock } = vi.hoisted(() => ({
  useHotkeysMock: vi.fn(),
}));

mockNuxtImport('useHotkeys', () => useHotkeysMock);

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
        Input: true,
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
});
