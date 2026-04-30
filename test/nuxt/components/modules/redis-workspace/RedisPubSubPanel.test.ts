import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RedisPubSubPanel from '~/components/modules/redis-workspace/components/RedisPubSubPanel.vue';

const fetchMock = vi.fn();
const activeSubscription = {
  sessionId: 'session-1',
  target: 'orders.*',
  mode: 'pattern',
  targets: [
    { target: 'orders.*', mode: 'pattern' },
    { target: 'orders.events', mode: 'channel' },
  ],
} as const;

const baseConnection = {
  id: 'redis-1',
  method: 'string',
  connectionString: 'redis://127.0.0.1:6379/0',
  host: '127.0.0.1',
  port: '6379',
  username: '',
  password: '',
  database: '0',
  ssl: undefined,
  ssh: undefined,
} as any;

const databases = [
  { index: 0, label: 'DB 0', keyCount: 12, expires: 0, avgTtl: null },
];

const flushAsyncState = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const mountComponent = () =>
  mount(RedisPubSubPanel, {
    props: {
      connection: baseConnection,
      databaseIndex: 0,
      databases,
    },
    global: {
      stubs: {
        Badge: { template: '<span><slot /></span>' },
        RedisDBSelector: { template: '<div />' },
        BaseEmpty: { template: '<div><slot /></div>' },
        Button: {
          props: ['disabled', 'ariaLabel'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
        },
        Input: {
          props: ['modelValue', 'id', 'placeholder'],
          emits: ['update:modelValue'],
          template:
            '<input :id="id" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Label: { template: '<label><slot /></label>' },
        Icon: true,
      },
    },
  });

describe('RedisPubSubPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal('$fetch', fetchMock);

    fetchMock.mockImplementation((url: string, options?: { body?: any }) => {
      if (url === '/api/redis/pubsub/overview') {
        return Promise.resolve({
          channels: [],
          patterns: [],
          patternCount: 0,
          subscription: {
            ...(options?.body?.sessionId === 'session-1'
              ? activeSubscription
              : {
                  sessionId: null,
                  target: null,
                  mode: null,
                  targets: [],
                }),
          },
        });
      }

      if (url === '/api/redis/pubsub/subscribe') {
        return Promise.resolve({
          messages: [],
          subscription: activeSubscription,
        });
      }

      if (url === '/api/redis/pubsub/messages') {
        return Promise.resolve({
          messages: [],
          subscription: activeSubscription,
        });
      }

      if (url === '/api/redis/pubsub/unsubscribe') {
        return Promise.resolve({ closed: false });
      }

      if (url === '/api/redis/pubsub/publish') {
        return Promise.resolve({});
      }

      return Promise.reject(new Error(`Unexpected fetch url: ${url}`));
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('subscribes without requiring an explicit mode and renders inferred targets', async () => {
    const wrapper = mountComponent();

    await flushAsyncState();
    await wrapper.find('#redis-pubsub-target').setValue('orders.*');
    const addTargetButton = wrapper
      .findAll('button')
      .find(button => button.text() === 'Add target');

    await addTargetButton?.trigger('click');
    await flushAsyncState();

    const subscribeCall = fetchMock.mock.calls.find(
      ([url]) => url === '/api/redis/pubsub/subscribe'
    );

    expect(subscribeCall?.[1]?.body).toMatchObject({
      target: 'orders.*',
      sessionId: null,
    });
    expect(subscribeCall?.[1]?.body.mode).toBeUndefined();
    expect(wrapper.text()).toContain('orders.*');
    expect(wrapper.text()).toContain('Pattern detected automatically');
    expect(wrapper.text()).toContain('orders.events');
  });

  it('removes an individual subscribed target', async () => {
    const wrapper = mountComponent();

    await flushAsyncState();
    await wrapper.find('#redis-pubsub-target').setValue('orders.*');
    const addTargetButton = wrapper
      .findAll('button')
      .find(button => button.text() === 'Add target');

    await addTargetButton?.trigger('click');
    await flushAsyncState();

    const removeButton = wrapper.find('button[aria-label="Remove orders.*"]');
    await removeButton.trigger('click');

    const unsubscribeCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        url === '/api/redis/pubsub/unsubscribe' &&
        options?.body?.target === 'orders.*'
    );

    expect(unsubscribeCall?.[1]?.body).toMatchObject({
      sessionId: 'session-1',
      target: 'orders.*',
    });
  });
});
