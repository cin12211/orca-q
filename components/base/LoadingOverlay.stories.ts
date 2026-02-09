import { h } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { Loader2 } from 'lucide-vue-next';
import LoadingOverlay from './LoadingOverlay.vue';

// Mock Icon component
const Icon = {
  props: ['name'],
  setup() {
    return () => h(Loader2, { class: 'animate-spin' });
  },
};

const meta = {
  title: 'Base/LoadingOverlay',
  component: LoadingOverlay,
  tags: ['autodocs'],
  argTypes: {
    visible: { control: 'boolean' },
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    visible: true,
  },
  render: args => ({
    components: { LoadingOverlay, Icon },
    setup() {
      // Register Icon globally for this story context if needed,
      // but since LoadingOverlay expects 'Icon', we can try to provide it via global components in decorator.
      // However, local registration in the wrapper only makes it available to the wrapper template, not child components.
      // So we need to rely on the fact that 'Icon' is likely expected to be globally registered.
      // We'll use the 'app' context in a decorator if this fails, but for now let's rely on module mocking if possible?
      // Actually, since LoadingOverlay uses <Icon>, we MUST register it globally.
    },
    template: `
      <div class="relative h-40 w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border rounded p-4">
        <p class="text-muted-foreground">Content behind overlay</p>
        <LoadingOverlay v-bind="args" />
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
