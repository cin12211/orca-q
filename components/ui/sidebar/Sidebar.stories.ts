import { h } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { Home, Inbox, Calendar, Search, Settings } from 'lucide-vue-next';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
} from './';

// Mock Icon
const Icon = {
  props: ['name'],
  setup(props: any) {
    const icons: Record<string, any> = {
      Home,
      Inbox,
      Calendar,
      Search,
      Settings,
    };
    return () => {
      const iconComp = icons[props.name] || Home;
      return h(iconComp, { class: 'size-4' });
    };
  },
};

const meta = {
  title: 'UI/Sidebar',
  component: SidebarProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof SidebarProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: {
      Sidebar,
      SidebarContent,
      SidebarFooter,
      SidebarGroup,
      SidebarHeader,
      SidebarMenu,
      SidebarMenuItem,
      SidebarMenuButton,
      SidebarProvider,
      SidebarRail,
      Icon,
    },
    setup() {
      const items = [
        { title: 'Home', url: '#', icon: 'Home' },
        { title: 'Inbox', url: '#', icon: 'Inbox' },
        { title: 'Calendar', url: '#', icon: 'Calendar' },
        { title: 'Search', url: '#', icon: 'Search' },
        { title: 'Settings', url: '#', icon: 'Settings' },
      ];
      return { args, items };
    },
    template: `
      <div class="h-[600px] border flex">
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem v-for="item in items" :key="item.title">
                  <SidebarMenuButton asChild>
                    <a :href="item.url">
                      <Icon :name="item.icon" />
                      <span>{{ item.title }}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <div class="flex-1 p-4">
             Main Content Area
        </div>
      </SidebarProvider>
      </div>
    `,
  }),
};
