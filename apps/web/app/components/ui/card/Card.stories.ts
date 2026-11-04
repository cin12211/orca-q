import type { Meta, StoryObj } from '@storybook/vue3';
import Button from '../button/Button.vue';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: {
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      CardFooter,
      Button,
    },
    template: `
      <Card class="w-[350px]">
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Deploy your new project in one-click.</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div class="grid w-full items-center gap-4">
              <div class="flex flex-col space-y-1.5">
                <label for="name" class="text-sm font-medium">Name</label>
                <input id="name" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="Name of your project" />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter class="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Deploy</Button>
        </CardFooter>
      </Card>
    `,
  }),
};
