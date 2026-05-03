import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RedisValueEditor from '~/components/modules/redis-workspace/components/RedisValueEditor.vue';

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

const mountComponent = () =>
  mount(RedisValueEditor, {
    props: {
      detail,
      canEdit: true,
    },
    global: {
      stubs: {
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
      },
    },
  });

describe('RedisValueEditor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders key metadata as badges', () => {
    const wrapper = mountComponent();

    const badges = wrapper.findAll('.badge');

    expect(badges.map(badge => badge.text())).toEqual(
      expect.arrayContaining([
        'DB 0',
        'string',
        'TTL 2m',
        'Size 1.0 KB',
        'Length 4',
        'Encoding embstr',
      ])
    );
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

  it('uses the shared loading overlay while key detail is loading', () => {
    const wrapper = mount(RedisValueEditor, {
      props: {
        detail: null,
        loading: true,
      },
      global: {
        stubs: {
          JsonEditorVue: { template: '<div />' },
          Badge: { template: '<span><slot /></span>' },
          Switch: { template: '<input />' },
          BaseEmpty: { template: '<div><slot /></div>' },
          Alert: { template: '<div><slot /></div>' },
          AlertDescription: { template: '<div><slot /></div>' },
          LoadingOverlay: {
            props: ['visible'],
            template: '<div v-if="visible" data-test="loading-overlay" />',
          },
          Button: {
            props: ['disabled'],
            template: '<button :disabled="disabled"><slot /></button>',
          },
          Input: { template: '<input />' },
          Label: { template: '<label><slot /></label>' },
        },
      },
    });

    expect(wrapper.find('[data-test="loading-overlay"]').exists()).toBe(true);
  });

  it('renders the Add Row action above the table for editable table previews', () => {
    const wrapper = mount(RedisValueEditor, {
      props: {
        detail: {
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
        },
        canEdit: true,
      },
      global: {
        stubs: {
          Badge: { template: '<span class="badge"><slot /></span>' },
          Switch: { template: '<input />' },
          JsonEditorVue: { template: '<div />' },
          BaseEmpty: { template: '<div><slot /></div>' },
          Alert: { template: '<div><slot /></div>' },
          AlertDescription: { template: '<div><slot /></div>' },
          LoadingOverlay: { template: '<div />' },
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
          Label: { template: '<label><slot /></label>' },
        },
      },
    });

    const html = wrapper.html();

    expect(html.indexOf('Add Row')).toBeGreaterThan(-1);
    expect(html.indexOf('Add Row')).toBeLessThan(html.indexOf('<table'));
  });

  it('keeps Save Changes disabled until the value is updated', async () => {
    const wrapper = mountComponent();
    const saveButton = wrapper.findAll('button').find(
      button => button.text() === 'Save Changes'
    );

    expect(saveButton?.attributes('disabled')).toBeDefined();

    await wrapper.find('textarea').setValue('refunded');

    expect(saveButton?.attributes('disabled')).toBeUndefined();
  });
});
