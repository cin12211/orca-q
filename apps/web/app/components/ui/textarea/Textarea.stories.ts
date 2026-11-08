import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import Textarea from './Textarea.vue';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Textarea },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template:
      '<Textarea v-model="value" v-bind="args" placeholder="Type your message here." />',
  }),
};

export const Disabled: Story = {
  render: args => ({
    components: { Textarea },
    setup() {
      return { args };
    },
    template: '<Textarea disabled placeholder="This area is disabled." />',
  }),
};

export const WithLabel: Story = {
  render: args => ({
    components: { Textarea },
    setup() {
      return { args };
    },
    template: `
      <div class="grid w-full gap-1.5">
        <label for="message" class="text-sm font-medium leading-none">Your Message</label>
        <Textarea placeholder="Type your message here." id="message" />
        <p class="text-sm text-muted-foreground">
          Your message will be copied to the support team.
        </p>
      </div>
    `,
  }),
};
