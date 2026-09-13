import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoRawQueryVariableUsageGuidePopover from '~/components/modules/raw-query/mongo/components/MongoRawQueryVariableUsageGuidePopover.vue';

describe('MongoRawQueryVariableUsageGuidePopover', () => {
  it('explains return, runtime variables, placeholders, and Mongo docs', () => {
    const wrapper = mount(MongoRawQueryVariableUsageGuidePopover, {
      global: {
        stubs: {
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Popover: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
        },
      },
    });

    expect(wrapper.text()).toContain('MongoDB raw query');
    expect(wrapper.text()).toContain('return');
    expect(wrapper.text()).toContain('db');
    expect(wrapper.text()).toContain('console.log');
    expect(wrapper.text()).toContain('ObjectId');
    expect(wrapper.text()).toContain('getSiblingDB');
    expect(wrapper.find('a[href*="mongodb.com/docs"]').exists()).toBe(true);
  });
});
