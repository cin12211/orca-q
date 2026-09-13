import { markRaw } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RawQueryEditorHeader from '~/components/modules/raw-query/components/RawQueryEditorHeader.vue';
import { RawQueryEditorLayout } from '~/components/modules/raw-query/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('RawQueryEditorHeader', () => {
  it('renders MongoDB Beta badge dynamically from registry for MongoDB database type', async () => {
    const wrapper = mount(RawQueryEditorHeader, {
      props: {
        workspaceId: 'ws-1',
        selectedConnectionId: 'conn-1',
        disableConnectionSwitch: false,
        connections: [],
        databaseType: DatabaseClientType.MONGODB,
        fileVariables: '',
        codeEditorLayout: RawQueryEditorLayout.horizontal,
      },
      global: {
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
          Badge: { template: '<span><slot /></span>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('MongoDB Beta');
  });

  it('does not render MongoDB Beta badge for PostgreSQL database type', () => {
    const wrapper = mount(RawQueryEditorHeader, {
      props: {
        workspaceId: 'ws-1',
        selectedConnectionId: 'conn-1',
        disableConnectionSwitch: false,
        connections: [],
        databaseType: DatabaseClientType.POSTGRES,
        fileVariables: '',
        codeEditorLayout: RawQueryEditorLayout.horizontal,
      },
      global: {
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
          Badge: { template: '<span><slot /></span>' },
        },
      },
    });

    expect(wrapper.text()).not.toContain('MongoDB Beta');
  });

  it('renders customLeftComponents and customRightComponents correctly', () => {
    const CustomLeft = markRaw({
      props: ['context'],
      template:
        '<div class="custom-left">Left: {{ context?.databaseType }}</div>',
    });
    const CustomRight = markRaw({
      props: ['context'],
      template:
        '<div class="custom-right">Right: {{ context?.workspaceId }}</div>',
    });

    const wrapper = mount(RawQueryEditorHeader, {
      props: {
        workspaceId: 'ws-test',
        selectedConnectionId: 'conn-1',
        disableConnectionSwitch: false,
        connections: [],
        databaseType: DatabaseClientType.POSTGRES,
        fileVariables: '',
        codeEditorLayout: RawQueryEditorLayout.horizontal,
        customLeftComponents: [CustomLeft],
        customRightComponents: [CustomRight],
      },
      global: {
        stubs: {
          Breadcrumb: true,
          BreadcrumbList: true,
          BreadcrumbItem: true,
          BreadcrumbLink: true,
          Button: { template: '<button><slot /></button>' },
          Icon: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: true,
          TooltipTrigger: { template: '<div><slot /></div>' },
          PureConnectionSelector: true,
          RedisDBSelector: true,
          AddVariableModal: true,
          RawQueryConfigModal: true,
        },
      },
    });

    expect(wrapper.find('.custom-left').text()).toContain('Left: postgres');
    expect(wrapper.find('.custom-right').text()).toContain('Right: ws-test');
  });
});
