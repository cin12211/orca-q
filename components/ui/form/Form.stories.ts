import type { Meta, StoryObj } from '@storybook/vue3';
import Button from '../button/Button.vue';
import Input from '../input/Input.vue';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from './';

// Note: Full form validation requires vee-validate setup which is complex to mock in Storybook static build.
// Showing layout components here.

const meta = {
  title: 'UI/Form',
  component: FormItem,
  tags: ['autodocs'],
} satisfies Meta<typeof FormItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: {
      FormItem,
      FormLabel,
      FormControl,
      FormDescription,
      FormMessage,
      Input,
      Button,
    },
    template: `
      <form class="w-2/3 space-y-6">
        <FormItem>
          <FormLabel>Username</FormLabel>
          <FormControl>
            <Input placeholder="shadcn" />
          </FormControl>
          <FormDescription>
            This is your public display name.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <Button type="submit">Submit</Button>
      </form>
    `,
  }),
};
