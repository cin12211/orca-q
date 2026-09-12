import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoQueryMoreOptions from '~/components/modules/quick-query/mongodb/components/MongoQueryMoreOptions.vue';

describe('MongoQueryMoreOptions', () => {
  it('renders all 5 fields with placeholders', () => {
    const wrapper = mount(MongoQueryMoreOptions);
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Sort');
    expect(wrapper.text()).toContain('Collation');
    expect(wrapper.text()).toContain('Index Hint');
    expect(wrapper.text()).toContain('Max Time MS');
  });

  it('uses h-6 for inputs and does not render Reset and Apply buttons', () => {
    const wrapper = mount(MongoQueryMoreOptions);
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBe(5);
    inputs.forEach(input => {
      expect(input.classes()).toContain('h-6');
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(0);
  });

  it('emits execute on Enter keypress in input', async () => {
    const wrapper = mount(MongoQueryMoreOptions);
    const projectInput = wrapper.find<HTMLInputElement>('input#more-project');
    await projectInput.trigger('keyup.enter');
    expect(wrapper.emitted('execute')).toBeTruthy();
  });

  it('emits close on Escape keydown', async () => {
    const wrapper = mount(MongoQueryMoreOptions);
    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('displays error messages when errors prop is provided', () => {
    const wrapper = mount(MongoQueryMoreOptions, {
      props: {
        errors: {
          project: 'Invalid JSON syntax',
          sort: 'Sort must be a JSON object',
        },
      },
    });

    expect(wrapper.text()).toContain('Invalid JSON syntax');
    expect(wrapper.text()).toContain('Sort must be a JSON object');
  });
});
