import { h } from 'vue';
import { Icon as NuxtIcon } from '#components';
import type { Meta, StoryObj } from '@storybook/vue3';
import BaseContextMenu from './BaseContextMenu.vue';
import { ContextMenuItemType } from './menuContext.type';

// Mock Icon component
const Icon = {
  props: ['name'],
  setup(props: { name?: string }) {
    return () =>
      h(NuxtIcon, {
        name: props.name || 'hugeicons:file-01',
        class: 'size-4',
      });
  },
};

const meta = {
  title: 'Base/BaseContextMenu',
  component: BaseContextMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof BaseContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockItems = [
  {
    type: ContextMenuItemType.LABEL,
    title: 'Actions',
  },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Open',
    icon: 'hugeicons:folder-01',
    select: () => console.log('Open selected'),
  },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Copy',
    icon: 'hugeicons:copy-01',
    select: () => console.log('Copy selected'),
  },
  {
    type: ContextMenuItemType.SEPARATOR,
  },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Delete',
    icon: 'hugeicons:delete-02',
    disabled: true,
  },
  {
    type: ContextMenuItemType.SUBMENU,
    title: 'More',
    items: [
      {
        type: ContextMenuItemType.ACTION,
        title: 'Details',
        select: () => console.log('Details selected'),
      },
    ],
  },
];

export const Default: Story = {
  args: {
    contextMenuItems: mockItems as any,
  },
  render: args => ({
    components: { BaseContextMenu, Icon },
    setup() {
      return { args };
    },
    template: `
      <div class="flex h-40 w-full items-center justify-center bg-gray-100 dark:bg-gray-800 border rounded border-dashed">
        <BaseContextMenu v-bind="args">
          <div class="p-4 bg-white dark:bg-black rounded shadow text-sm">
            Right click here
          </div>
        </BaseContextMenu>
      </div>
    `,
  }),
  decorators: [
    (story, context) => {
      const { app } = context;
      app.component('Icon', Icon);
      return story();
    },
  ],
};
