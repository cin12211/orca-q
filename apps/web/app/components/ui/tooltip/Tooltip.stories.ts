import type { Meta, StoryObj } from '@storybook/vue3';
import Button from '../button/Button.vue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: {
      Tooltip,
      TooltipContent,
      TooltipProvider,
      TooltipTrigger,
      Button,
    },
    template: `
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add to library</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    `,
  }),
};
