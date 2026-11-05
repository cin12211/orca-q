import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import SchemaSelector from '~/components/modules/selectors/SchemaSelector.vue';

const schema = (name: string, isSystem = false) => ({
  id: `ws-conn-${name}`,
  workspaceId: 'ws',
  connectionId: 'conn',
  name,
  isSystem,
  tables: [],
  views: [],
  functions: [],
});

const schemas = [
  schema('adt'),
  schema('public'),
  schema('information_schema', true),
  schema('pg_catalog', true),
];

vi.mock('pinia', async importOriginal => ({
  ...(await importOriginal<typeof import('pinia')>()),
  // The mocked stores below are plain objects of refs, not real Pinia stores.
  storeToRefs: (store: unknown) => store,
}));

vi.mock('~/core/stores', async importOriginal => ({
  ...(await importOriginal<typeof import('~/core/stores')>()),
  useSchemaStore: () => ({
    activeSchema: ref(schemas[1]),
    schemasByContext: ref(schemas),
  }),
  useWSStateStore: () => ({ schemaId: ref('public') }),
}));

vi.mock('~/core/contexts/useAppContext', () => ({
  useAppContext: () => ({ setSchemaId: vi.fn() }),
}));

const passthrough = { template: '<div><slot /></div>' };

const mountSelector = () =>
  mount(SchemaSelector, {
    props: { class: '' },
    global: {
      stubs: {
        Select: passthrough,
        SelectTrigger: passthrough,
        SelectContent: passthrough,
        SelectGroup: { template: '<div data-test="group"><slot /></div>' },
        SelectLabel: { template: '<span data-test="label"><slot /></span>' },
        SelectSeparator: { template: '<hr data-test="separator" />' },
        SelectItem: {
          props: ['value'],
          template: '<div data-test="item" :data-value="value"><slot /></div>',
        },
      },
    },
  });

describe('SchemaSelector', () => {
  it('lists user schemas first, then system schemas under a "System" group', () => {
    const wrapper = mountSelector();

    const groups = wrapper.findAll('[data-test="group"]');
    const values = (group: (typeof groups)[number]) =>
      group
        .findAll('[data-test="item"]')
        .map(item => item.attributes('data-value'));

    expect(groups).toHaveLength(2);
    expect(values(groups[0]!)).toEqual(['adt', 'public']);
    expect(groups[1]!.find('[data-test="label"]').text()).toBe('System');
    expect(values(groups[1]!)).toEqual(['information_schema', 'pg_catalog']);
    expect(wrapper.find('[data-test="separator"]').exists()).toBe(true);
  });
});
