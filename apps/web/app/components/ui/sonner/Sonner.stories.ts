import type { Meta, StoryObj } from '@storybook/vue3';
import { toast } from 'vue-sonner';
import Button from '../button/Button.vue';
import { Toaster } from './';

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Toaster, Button },
    setup() {
      const showToast = () => {
        toast('Event has been created', {
          description: 'Sunday, December 03, 2023 at 9:00 AM',
          action: {
            label: 'Undo',
            onClick: () => console.log('Undo'),
          },
        });
      };
      return { args, showToast };
    },
    template: `
      <div>
        <Toaster />
        <Button variant="outline" @click="showToast">
          Show Toast
        </Button>
      </div>
    `,
  }),
};
