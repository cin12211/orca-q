import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHotkeys, type Hotkey } from '~/core/composables/useHotKeys';

const mountHotkeysHarness = ({
  hotkeys,
  isPreventDefault = false,
  target,
}: {
  hotkeys: Hotkey[] | ReturnType<typeof ref<Hotkey[]>>;
  isPreventDefault?: boolean;
  target?: HTMLElement;
}) => {
  const hotkeysRef = Array.isArray(hotkeys) ? ref(hotkeys) : hotkeys;
  const targetRef = ref<HTMLElement | undefined>(target);

  const component = defineComponent({
    setup() {
      if (target) {
        useHotkeys(hotkeysRef as unknown as Hotkey[], {
          isPreventDefault,
          target: targetRef as any,
        });
      } else {
        useHotkeys(hotkeysRef as unknown as Hotkey[], {
          isPreventDefault,
        });
      }
      return () => h('div');
    },
  });

  return {
    wrapper: mount(component, { attachTo: document.body }),
    hotkeysRef,
    targetRef,
  };
};

describe('useHotkeys', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('triggers callback for matching key combination', () => {
    const callback = vi.fn();
    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'ctrl+s', callback }],
    });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    );

    expect(callback).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('does not trigger callback for non-matching key', () => {
    const callback = vi.fn();
    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'ctrl+s', callback }],
    });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', ctrlKey: true })
    );

    expect(callback).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('prevents default when global isPreventDefault is true', () => {
    const callback = vi.fn();
    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'ctrl+s', callback }],
      isPreventDefault: true,
    });

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('prevents default when hotkey option isPreventDefault is true', () => {
    const callback = vi.fn();
    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'ctrl+s', callback, isPreventDefault: true }],
      isPreventDefault: false,
    });

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('does not trigger callback when excludeInput is true and input is active', () => {
    const callback = vi.fn();
    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'enter', callback, excludeInput: true }],
    });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(callback).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('listens on custom target element when provided', () => {
    const callback = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);

    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'ctrl+k', callback }],
      target,
    });

    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    );

    expect(callback).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('reacts to hotkeys ref updates', async () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const hotkeysRef = ref<Hotkey[]>([
      { key: 'ctrl+a', callback: firstCallback },
    ]);
    const { wrapper } = mountHotkeysHarness({ hotkeys: hotkeysRef });

    hotkeysRef.value = [{ key: 'ctrl+b', callback: secondCallback }];
    await nextTick();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', ctrlKey: true })
    );

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('removes listener on unmount', () => {
    const callback = vi.fn();
    const { wrapper } = mountHotkeysHarness({
      hotkeys: [{ key: 'ctrl+s', callback }],
    });

    wrapper.unmount();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    );

    expect(callback).not.toHaveBeenCalled();
  });
});
