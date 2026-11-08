import type { Meta, StoryObj } from '@storybook/vue3';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './';

const meta = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['lg', 'default', 'sm', 'xs', 'xxs'],
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: {
      Select,
      SelectContent,
      SelectGroup,
      SelectItem,
      SelectLabel,
      SelectTrigger,
      SelectValue,
    },
    setup() {
      return { args };
    },
    template: `
      <Select v-bind="args">
        <SelectTrigger class="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
            <SelectItem value="grapes">Grapes</SelectItem>
            <SelectItem value="pineapple">Pineapple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    `,
  }),
  args: {
    size: 'default',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: {
      Select,
      SelectContent,
      SelectGroup,
      SelectItem,
      SelectLabel,
      SelectTrigger,
      SelectValue,
    },
    template: `
      <div class="flex w-[280px] flex-col gap-3">
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">lg</span>
          <Select size="lg">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Large select" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple-lg">Apple</SelectItem>
                <SelectItem value="banana-lg">Banana</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">default</span>
          <Select size="default">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Default select" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple-default">Apple</SelectItem>
                <SelectItem value="banana-default">Banana</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">sm</span>
          <Select size="sm">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Small select" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple-sm">Apple</SelectItem>
                <SelectItem value="banana-sm">Banana</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">xs</span>
          <Select size="xs">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Extra small select" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple-xs">Apple</SelectItem>
                <SelectItem value="banana-xs">Banana</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">xxs</span>
          <Select size="xxs">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Compact select" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple-xxs">Apple</SelectItem>
                <SelectItem value="banana-xxs">Banana</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    `,
  }),
};
