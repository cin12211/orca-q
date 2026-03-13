import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CodeHighlightPreview from '~/components/base/CodeHighlightPreview.vue';

const { highlightMock } = vi.hoisted(() => ({
  highlightMock: vi.fn(),
}));

vi.mock('~/core/composables/useSqlHighlighter', () => ({
  useCodeHighlighter: () => ({
    highlight: highlightMock,
  }),
}));

vi.mock('~/components/ui/button', () => ({
  Button: defineComponent({
    name: 'Button',
    inheritAttrs: false,
    props: {
      variant: String,
      size: String,
      class: {
        type: [String, Array, Object],
        default: '',
      },
    },
    emits: ['click'],
    setup(props, { slots, emit, attrs }) {
      return () =>
        h(
          'button',
          {
            ...attrs,
            class: props.class,
            onClick: (event: MouseEvent) => emit('click', event),
          },
          slots.default?.()
        );
    },
  }),
}));

vi.mock('~/components/ui/tooltip', () => ({
  Tooltip: defineComponent({
    name: 'Tooltip',
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  }),
  TooltipTrigger: defineComponent({
    name: 'TooltipTrigger',
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  }),
  TooltipContent: defineComponent({
    name: 'TooltipContent',
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  }),
}));

const mountPreview = (
  props?: Partial<InstanceType<typeof CodeHighlightPreview>['$props']>
) => {
  return mount(CodeHighlightPreview, {
    props: {
      code: 'SELECT 1;',
      ...props,
    },
    global: {
      stubs: {
        Icon: defineComponent({
          name: 'Icon',
          props: {
            name: {
              type: String,
              default: '',
            },
          },
          setup(iconProps) {
            return () => h('i', { 'data-icon-name': iconProps.name });
          },
        }),
      },
    },
  });
};

describe('CodeHighlightPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    highlightMock.mockReturnValue(
      '<pre><code><span>SELECT 1;</span></code></pre>'
    );

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders default SQL language label in uppercase', () => {
    const wrapper = mountPreview();

    expect(wrapper.text()).toContain('SQL');
  });

  it('calls highlight with code, language and decorations', () => {
    mountPreview({
      code: 'SELECT * FROM users;',
      language: 'sql',
      decorations: [
        { start: 0, end: 6, properties: { className: 'err' } } as any,
      ],
    });

    expect(highlightMock).toHaveBeenCalledWith('SELECT * FROM users;', 'sql', {
      decorations: [{ start: 0, end: 6, properties: { className: 'err' } }],
    });
  });

  it('renders highlighted HTML output when available', () => {
    const wrapper = mountPreview({ code: 'SELECT 2;' });

    expect(wrapper.html()).toContain('<span>SELECT 1;</span>');
  });

  it('renders plain text fallback when highlighter returns empty string', () => {
    highlightMock.mockReturnValue('');
    const wrapper = mountPreview({ code: 'SELECT fallback;' });

    expect(wrapper.find('pre').exists()).toBe(true);
    expect(wrapper.text()).toContain('SELECT fallback;');
  });

  it('hides copy button when showCopyButton is false', () => {
    const wrapper = mountPreview({ showCopyButton: false });

    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('applies maxHeight style when provided', () => {
    const wrapper = mountPreview({ maxHeight: '140px' });
    const contentContainer = wrapper
      .findAll('div')
      .find(node => node.attributes('style')?.includes('max-height'));

    expect(contentContainer).toBeTruthy();
    expect(contentContainer?.attributes('style')).toContain(
      'max-height: 140px'
    );
  });

  it('copies code and toggles copied tooltip state', async () => {
    const wrapper = mountPreview({ code: 'SELECT copied;' });
    const copyButton = wrapper.find('button');

    await copyButton.trigger('click');

    expect(
      (globalThis.navigator as any).clipboard.writeText
    ).toHaveBeenCalledWith('SELECT copied;');
    expect(wrapper.text()).toContain('Copied!');

    vi.advanceTimersByTime(1500);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Copy code');
  });

  it('does not call clipboard when code is empty', async () => {
    const wrapper = mountPreview({ code: '' });
    const copyButton = wrapper.find('button');

    await copyButton.trigger('click');

    expect(
      (globalThis.navigator as any).clipboard.writeText
    ).not.toHaveBeenCalled();
  });

  it('swallows clipboard errors and keeps default tooltip text', async () => {
    (globalThis.navigator as any).clipboard.writeText = vi
      .fn()
      .mockRejectedValue(new Error('clipboard unavailable'));

    const wrapper = mountPreview({ code: 'SELECT fail;' });
    const copyButton = wrapper.find('button');

    await copyButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Copy code');
  });
});
