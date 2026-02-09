import { h } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { File, Folder, Trash, Copy } from 'lucide-vue-next';
import BaseContextMenu from './BaseContextMenu.vue';
import { ContextMenuItemType } from './menuContext.type';

// Mock Icon component
const Icon = {
  props: ['name'],
  setup(props: any) {
    const icons: Record<string, any> = {
      'lucide:file': File,
      'lucide:folder': Folder,
      'lucide:trash': Trash,
      'lucide:copy': Copy,
    };
    return () => {
      const iconComp = icons[props.name] || File;
      return h(iconComp, { class: 'size-4' });
    };
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
    icon: 'lucide:folder',
    select: () => console.log('Open selected'),
  },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Copy',
    icon: 'lucide:copy',
    select: () => console.log('Copy selected'),
  },
  {
    type: ContextMenuItemType.SEPARATOR,
  },
  {
    type: ContextMenuItemType.ACTION,
    title: 'Delete',
    icon: 'lucide:trash',
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
