import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Input from '~/components/ui/input/Input.vue';

describe('Input.vue', () => {
  it('applies default size class when size is omitted', () => {
    const wrapper = mount(Input);
    expect(wrapper.classes()).toContain('h-9');
    expect(wrapper.classes()).toContain('px-3');
  });

  it('applies xxs size classes correctly', () => {
    const wrapper = mount(Input, {
      props: { size: 'xxs' },
    });
    expect(wrapper.classes()).toContain('h-6');
    expect(wrapper.classes()).toContain('px-2');
    expect(wrapper.classes()).toContain('text-xs');
  });

  it('applies xs, sm, and lg sizes correctly', () => {
    const xsWrapper = mount(Input, { props: { size: 'xs' } });
    expect(xsWrapper.classes()).toContain('h-7');
    expect(xsWrapper.classes()).toContain('text-xs');

    const smWrapper = mount(Input, { props: { size: 'sm' } });
    expect(smWrapper.classes()).toContain('h-8');
    expect(smWrapper.classes()).toContain('text-sm');

    const lgWrapper = mount(Input, { props: { size: 'lg' } });
    expect(lgWrapper.classes()).toContain('h-11');
    expect(lgWrapper.classes()).toContain('text-base');
  });

  it('binds modelValue and updates on input event', async () => {
    const wrapper = mount(Input, {
      props: { modelValue: 'hello' },
    });
    const input = wrapper.find('input');
    expect(input.element.value).toBe('hello');

    await input.setValue('world');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['world']);
  });

  it('exposes focus method and el ref', () => {
    const wrapper = mount(Input);
    expect(typeof wrapper.vm.focus).toBe('function');
    expect(wrapper.vm.el).toBeInstanceOf(HTMLInputElement);
  });
});
