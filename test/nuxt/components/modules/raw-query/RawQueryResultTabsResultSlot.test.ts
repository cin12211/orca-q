import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postgresCommandResult } from '~/components/modules/driver/postgres/raw-query/services';
import RawQueryResultTabs from '~/components/modules/raw-query/components/RawQueryResultTabs.vue';

function createExecutedResults(view = 'result') {
  return new Map([
    [
      'query-1',
      {
        id: 'query-1',
        metadata: {
          queryTime: 12,
          statementQuery: 'SELECT 1',
          executedAt: new Date('2026-05-21T00:00:00.000Z'),
          executeErrors: undefined,
          fieldDefs: [],
          connection: {
            id: 'conn-1',
            workspaceId: 'workspace',
          },
        },
        result: [{ value: 1 }],
        seqIndex: 1,
        view,
      },
    ],
  ]);
}

const globalOptions = (pinia: ReturnType<typeof createPinia>) => ({
  plugins: [pinia],
  stubs: {
    BaseEmpty: {
      props: ['title'],
      template: '<div data-test="empty">{{ title }}</div>',
    },
    ContextMenu: { template: '<div><slot /></div>' },
    ContextMenuContent: { template: '<div><slot /></div>' },
    ContextMenuItem: { template: '<button><slot /></button>' },
    ContextMenuTrigger: { template: '<div><slot /></div>' },
    Icon: true,
    LoadingOverlay: { template: '<div data-test="loading" />' },
    ResultTabErrorView: true,
    ResultTabInfoView: true,
    ResultTabRawView: true,
    ResultTabResultView: {
      template: '<div data-test="default-result-view" />',
    },
    Tooltip: { template: '<div><slot /></div>' },
    TooltipContent: { template: '<div><slot /></div>' },
    TooltipTrigger: { template: '<div><slot /></div>' },
  },
});

const baseProps = {
  executedResults: createExecutedResults(),
  activeTabId: 'query-1',
  executeLoading: false,
  isStreaming: false,
  resolveCommandResultHandler: () => postgresCommandResult,
};

describe('RawQueryResultTabs result-view slot', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the built-in view set when no slot is provided', async () => {
    const wrapper = mount(RawQueryResultTabs, {
      props: { ...baseProps },
      global: globalOptions(pinia),
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      true
    );
  });

  it('replaces the body with the provided result-view slot content', async () => {
    const wrapper = mount(RawQueryResultTabs, {
      props: { ...baseProps },
      slots: {
        'result-view': '<div data-test="engine-view" />',
      },
      global: globalOptions(pinia),
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="engine-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      false
    );
  });

  it('falls back to the built-in view set when the slot renders nothing', async () => {
    const wrapper = mount(RawQueryResultTabs, {
      props: { ...baseProps },
      slots: {
        'result-view': '<div v-if="false" data-test="engine-view" />',
      },
      global: globalOptions(pinia),
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="engine-view"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      true
    );
  });

  it('exposes the active tab to the slot', async () => {
    const wrapper = mount(RawQueryResultTabs, {
      props: { ...baseProps },
      slots: {
        'result-view': '<div data-test="engine-view">{{ params.tab.id }}</div>',
      },
      global: globalOptions(pinia),
    });

    await nextTick();
    await nextTick();

    expect(wrapper.get('[data-test="engine-view"]').text()).toBe('query-1');
  });

  const NOT_AVAILABLE_TITLE = 'View not available';

  const mountExplain = (slots?: Record<string, string>) =>
    mount(RawQueryResultTabs, {
      props: {
        ...baseProps,
        executedResults: createExecutedResults('explain'),
      },
      slots,
      global: globalOptions(pinia),
    });

  it('shows the not-available state for a view only an engine can render', async () => {
    const wrapper = mountExplain();

    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain(NOT_AVAILABLE_TITLE);
    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      false
    );
  });

  it('renders the engine content instead of the not-available state', async () => {
    const wrapper = mountExplain({
      'result-view': '<div data-test="engine-view" />',
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="engine-view"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain(NOT_AVAILABLE_TITLE);
  });

  it('does not show the not-available state for the result view', async () => {
    const wrapper = mount(RawQueryResultTabs, {
      props: { ...baseProps },
      slots: {
        'result-view': '<div v-if="false" data-test="engine-view" />',
      },
      global: globalOptions(pinia),
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      true
    );
    expect(wrapper.text()).not.toContain(NOT_AVAILABLE_TITLE);
  });
});
