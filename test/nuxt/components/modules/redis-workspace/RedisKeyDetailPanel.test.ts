import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RedisKeyDetailPanel from '~/components/modules/redis-workspace/components/RedisKeyDetailPanel.vue';

const detail = {
  key: 'orders:1',
  type: 'string',
  ttl: 120,
  ttlLabel: '2m',
  databaseIndex: 0,
  value: 'paid',
  previewKind: 'text',
  editingSupported: true,
  memoryUsage: 1024,
  memoryUsageHuman: '1.0 KB',
  length: 4,
  encoding: 'embstr',
  stringFormat: 'plain',
} as const;

const globalStubs = {
  Badge: {
    template: '<span class="badge"><slot /></span>',
  },
  Switch: {
    props: {
      checked: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['update:checked'],
    template:
      '<input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" />',
  },
  JsonEditorVue: {
    template: '<div />',
  },
  BaseEmpty: {
    template: '<div><slot /></div>',
  },
  Alert: {
    template: '<div><slot /></div>',
  },
  AlertDescription: {
    template: '<div><slot /></div>',
  },
  LoadingOverlay: {
    props: ['visible'],
    template: '<div v-if="visible" data-test="loading-overlay" />',
  },
  Button: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  Input: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Label: {
    template: '<label><slot /></label>',
  },
};

const mountComponent = (overrideProps: Record<string, unknown> = {}) =>
  mount(RedisKeyDetailPanel, {
    props: {
      info: detail,
      detail,
      canEdit: true,
      ...overrideProps,
    },
    global: {
      stubs: globalStubs,
    },
  });

describe('RedisKeyDetailPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders key metadata as badges once info and value are loaded', () => {
    const wrapper = mountComponent();

    const badges = wrapper.findAll('.badge');

    expect(badges.map(badge => badge.text())).toEqual(
      expect.arrayContaining([
        'string',
        'Size 1.0 KB',
        'Length 4',
        'Encoding embstr',
      ])
    );
    expect(wrapper.text()).toContain('Current: 2m');
  });

  it('renders metadata from the fast info call before the value call resolves', () => {
    const wrapper = mountComponent({ detail: null, loadingValue: true });

    expect(wrapper.text()).toContain('string');
    expect(wrapper.text()).toContain('Size 1.0 KB');
    expect(wrapper.find('[data-test="loading-overlay"]').exists()).toBe(true);
  });

  it('keeps auto refresh off by default and emits refresh every 5 seconds when enabled', async () => {
    vi.useFakeTimers();

    const wrapper = mountComponent();
    const toggle = wrapper.find('input[type="checkbox"]');

    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.emitted('refresh')).toBeUndefined();

    await toggle.setValue(true);
    await vi.advanceTimersByTimeAsync(5000);

    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('emits refresh immediately when the manual refresh button is clicked', async () => {
    const wrapper = mountComponent();

    await wrapper
      .find('button[aria-label="Refresh key detail"]')
      .trigger('click');

    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('emits delete when the Delete button is clicked', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button[aria-label="Delete key"]').trigger('click');

    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('uses the shared loading overlay while nothing has loaded yet', () => {
    const wrapper = mount(RedisKeyDetailPanel, {
      props: {
        info: null,
        detail: null,
        loadingInfo: true,
        loadingValue: true,
      },
      global: {
        stubs: globalStubs,
      },
    });

    expect(wrapper.find('[data-test="loading-overlay"]').exists()).toBe(true);
  });

  it('renders the Add Row action above the table for editable table previews', () => {
    const tableDetail = {
      key: 'orders:set',
      type: 'hash',
      ttl: 120,
      ttlLabel: '2m',
      databaseIndex: 0,
      value: null,
      previewKind: 'table',
      editingSupported: true,
      memoryUsage: 1024,
      memoryUsageHuman: '1.0 KB',
      length: 1,
      encoding: 'hashtable',
      stringFormat: 'plain',
      tableKind: 'hash',
      tableColumns: [
        { key: 'field', label: 'Field', editable: true, type: 'string' },
        { key: 'value', label: 'Value', editable: true, type: 'string' },
      ],
      tableRows: [{ id: 'row-1', field: 'status', value: 'paid' }],
    };

    const wrapper = mount(RedisKeyDetailPanel, {
      props: {
        info: tableDetail,
        detail: tableDetail,
        canEdit: true,
      },
      global: {
        stubs: globalStubs,
      },
    });

    const html = wrapper.html();

    expect(html.indexOf('Add Row')).toBeGreaterThan(-1);
    expect(html.indexOf('Add Row')).toBeLessThan(html.indexOf('<table'));
  });

  it('keeps Save Changes disabled until the value is updated', async () => {
    const wrapper = mountComponent();
    const saveButton = wrapper
      .findAll('button')
      .find(button => button.text() === 'Save Changes');

    expect(saveButton?.attributes('disabled')).toBeDefined();

    await wrapper.find('textarea').setValue('refunded');

    expect(saveButton?.attributes('disabled')).toBeUndefined();
  });
});
