import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import Switch from './Switch.vue';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Switch },
    setup() {
      const checked = ref(false);
      return { args, checked };
    },
    template: `
      <div class="flex items-center space-x-2">
        <Switch id="airplane-mode" v-model:checked="checked" />
        <label for="airplane-mode" class="text-sm font-medium leading-none">Airplane Mode</label>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: args => ({
    components: { Switch },
    setup() {
      return { args };
    },
    template: `
      <div class="flex items-center space-x-2">
        <Switch id="disabled-mode" disabled />
        <label for="disabled-mode" class="text-sm font-medium leading-none opacity-50">Disabled</label>
      </div>
    `,
  }),
};
