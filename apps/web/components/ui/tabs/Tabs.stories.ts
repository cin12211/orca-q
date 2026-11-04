import type { Meta, StoryObj } from '@storybook/vue3';
import Button from '../button/Button.vue';
import Card from '../card/Card.vue';
import CardContent from '../card/CardContent.vue';
import CardDescription from '../card/CardDescription.vue';
import CardFooter from '../card/CardFooter.vue';
import CardHeader from '../card/CardHeader.vue';
import CardTitle from '../card/CardTitle.vue';
import Input from '../input/Input.vue';
import Label from '../label/Label.vue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['lg', 'default', 'sm', 'xs', 'xxs'],
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: {
      Tabs,
      TabsContent,
      TabsList,
      TabsTrigger,
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      CardFooter,
      Button,
      Input,
      Label,
    },
    setup() {
      return { args };
    },
    template: `
      <Tabs v-bind="args" class="w-[400px]">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Make changes to your account here. Click save when you're done.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-2">
              <div class="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue="Pedro Duarte" />
              </div>
              <div class="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue="@peduarte" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password here. After saving, you'll be logged out.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-2">
              <div class="space-y-1">
                <Label htmlFor="current">Current password</Label>
                <Input id="current" type="password" />
              </div>
              <div class="space-y-1">
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save password</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    `,
  }),
  args: {
    defaultValue: 'account',
    size: 'default',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: {
      Tabs,
      TabsList,
      TabsTrigger,
      TabsContent,
    },
    template: `
      <div class="flex w-[360px] flex-col gap-4">
        <Tabs defaultValue="overview" size="lg">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="text-sm text-muted-foreground">
            Large tabs
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="overview" size="default">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="text-sm text-muted-foreground">
            Default tabs
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="overview" size="sm">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="text-sm text-muted-foreground">
            Small tabs
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="overview" size="xs">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="text-sm text-muted-foreground">
            Extra small tabs
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="overview" size="xxs">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="text-sm text-muted-foreground">
            Compact tabs
          </TabsContent>
        </Tabs>
      </div>
    `,
  }),
};
