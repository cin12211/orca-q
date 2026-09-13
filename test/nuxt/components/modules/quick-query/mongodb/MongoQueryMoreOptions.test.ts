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
    expect(wrapper.text()).toContain('Max Time');
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

  it('binds initial modelValue to inputs', () => {
    const wrapper = mount(MongoQueryMoreOptions, {
      props: {
        modelValue: {
          sort: '{ "createdAt": 1 }',
          project: '{ "name": 1 }',
          collation: '',
          hint: '',
          maxTimeMS: '5000',
        },
      },
    });
    expect(
      wrapper.find<HTMLInputElement>('input#more-sort').element.value
    ).toBe('{ "createdAt": 1 }');
    expect(
      wrapper.find<HTMLInputElement>('input#more-project').element.value
    ).toBe('{ "name": 1 }');
    expect(
      wrapper.find<HTMLInputElement>('input#more-maxtimems').element.value
    ).toBe('5000');
  });

  it('marks input with border-destructive when errors prop is provided', () => {
    const wrapper = mount(MongoQueryMoreOptions, {
      props: {
        errors: {
          project: 'Invalid JSON syntax',
          sort: 'Sort must be a JSON object',
        },
      },
    });

    expect(wrapper.find('input#more-project').classes()).toContain(
      'border-destructive'
    );
    expect(wrapper.find('input#more-sort').classes()).toContain(
      'border-destructive'
    );
    expect(wrapper.find('input#more-collation').classes()).not.toContain(
      'border-destructive'
    );
  });
});
