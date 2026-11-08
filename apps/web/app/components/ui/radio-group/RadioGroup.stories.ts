import type { Meta, StoryObj } from '@storybook/vue3';
import Label from '../label/Label.vue';
import { RadioGroup, RadioGroupItem } from './';

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { RadioGroup, RadioGroupItem, Label },
    template: `
      <RadioGroup defaultValue="option-one">
        <div class="flex items-center space-x-2">
          <RadioGroupItem id="option-one" value="option-one" />
          <Label htmlFor="option-one">Option One</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem id="option-two" value="option-two" />
          <Label htmlFor="option-two">Option Two</Label>
        </div>
      </RadioGroup>
    `,
  }),
};
