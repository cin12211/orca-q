import type { Meta, StoryObj } from '@storybook/vue3';
import DynamicTable from './DynamicTable.vue';

const meta = {
  title: 'Base/DynamicTable',
  component: DynamicTable,
  tags: ['autodocs'],
  argTypes: {
    columnKeyBy: { control: 'radio', options: ['index', 'field'] },
  },
} satisfies Meta<typeof DynamicTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const columns = [
  { originalName: 'id', aliasFieldName: 'ID', isPrimaryKey: true },
  { originalName: 'name', aliasFieldName: 'Name' },
  { originalName: 'email', aliasFieldName: 'Email' },
  { originalName: 'role', aliasFieldName: 'Role' },
];

const data = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' },
];

export const Basic: Story = {
  args: {
    columns: columns as any,
    data: data,
    columnKeyBy: 'field',
  },
  render: args => ({
    components: { DynamicTable },
    setup() {
      return { args };
    },
    template:
      '<div class="h-[400px] w-full"><DynamicTable v-bind="args" /></div>',
  }),
};

export const Empty: Story = {
  args: {
    columns: columns as any,
    data: [],
    columnKeyBy: 'field',
  },
  render: args => ({
    components: { DynamicTable },
    setup() {
      return { args };
    },
    template:
      '<div class="h-[400px] w-full"><DynamicTable v-bind="args" /></div>',
  }),
};
