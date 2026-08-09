import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ConnectionStatusSection from '~/components/modules/connection/components/ConnectionStatusSection.vue';

const IconStub = defineComponent({
  name: 'Icon',
  props: { name: { type: String, default: '' } },
  template: '<i :data-icon="name" />',
});

const mountSection = (
  props: Partial<InstanceType<typeof ConnectionStatusSection>['$props']>
) =>
  mount(ConnectionStatusSection, {
    props: { testStatus: 'idle', ...props },
    global: { stubs: { Icon: IconStub } },
  });

describe('ConnectionStatusSection', () => {
  it('shows the testing state', () => {
    const wrapper = mountSection({ testStatus: 'testing' });
    expect(wrapper.text()).toContain('Testing connection');
  });

  it('shows the success state', () => {
    const wrapper = mountSection({ testStatus: 'success' });
    expect(wrapper.text()).toContain('Connection successful');
  });

  it('renders the error message and hint', () => {
    const wrapper = mountSection({
      testStatus: 'error',
      errorMessage: 'Authentication failed — wrong username or password.',
      errorHint: 'Double-check the database username and password.',
    });

    expect(wrapper.text()).toContain('Authentication failed');
    expect(wrapper.text()).toContain('Double-check the database username');
  });

  it('hides the raw detail until toggled', async () => {
    const wrapper = mountSection({
      testStatus: 'error',
      errorMessage: 'Could not connect to the database.',
      errorDetail: 'ECONNREFUSED 127.0.0.1:5432',
    });

    expect(wrapper.text()).toContain('Show technical details');
    expect(wrapper.find('pre').exists()).toBe(false);

    await wrapper.get('button').trigger('click');

    expect(wrapper.find('pre').exists()).toBe(true);
    expect(wrapper.find('pre').text()).toContain('ECONNREFUSED');
    expect(wrapper.text()).toContain('Hide technical details');
  });

  it('does not render a detail toggle when there is no detail', () => {
    const wrapper = mountSection({
      testStatus: 'error',
      errorMessage: 'Could not connect to the database.',
    });

    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('falls back to a generic message when none is provided', () => {
    const wrapper = mountSection({ testStatus: 'error' });
    expect(wrapper.text()).toContain('Connection failed');
  });
});
