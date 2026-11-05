import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TabViewOpenActions from '~/components/modules/app-shell/tab-view-container/components/TabViewOpenActions.vue';

const mountComponent = () =>
  mount(TabViewOpenActions, {
    global: {
      stubs: {
        Button: {
          template: '<button><slot /></button>',
        },
        Icon: true,
        Tooltip: {
          template: '<div><slot /></div>',
        },
        TooltipTrigger: {
          template: '<div><slot /></div>',
        },
        TooltipContent: {
          template: '<div><slot /></div>',
        },
        DropdownMenu: {
          template: '<div><slot /></div>',
        },
        DropdownMenuTrigger: {
          template: '<div><slot /></div>',
        },
        DropdownMenuContent: {
          template: '<div><slot /></div>',
        },
        DropdownMenuItem: {
          template: '<div><slot /></div>',
        },
        DropdownMenuLabel: {
          template: '<div><slot /></div>',
        },
        DropdownMenuSeparator: {
          template: '<div />',
        },
      },
    },
  });

describe('TabViewOpenActions', () => {
  it('renders the default SQL file copy', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('New SQL file');
    expect(wrapper.text()).toContain('Schema browser');
  });
});
