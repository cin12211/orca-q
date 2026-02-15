<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Dialog,
  DialogContent,
  Icon,
} from '#components';
import { Globe, Lock, Paintbrush, Settings } from 'lucide-vue-next';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import AgentConfig from './AgentConfig.vue';
import EditorConfig from './EditorConfig.vue';
import QuickQueryConfig from './QuickQueryConfig.vue';

const settingNavs = [
  // { name: 'Notifications', icon: Bell },
  // { name: 'Navigation', icon: Menu },
  // { name: 'Home', icon: Home },
  {
    name: 'Editor',
    icon: h(Icon, { name: 'lucide:scroll-text', class: 'size-4!' }),
    component: EditorConfig,
  },
  {
    name: 'Quick Query',
    icon: h(Icon, { name: 'lucide:table-2', class: 'size-4!' }),
    component: QuickQueryConfig,
  },
  {
    name: 'Agent',
    icon: h(Icon, { name: 'hugeicons:chat-bot', class: 'size-4!' }),
    component: AgentConfig,
  },
  { name: 'Appearance', icon: Paintbrush, disable: true },
  // { name: 'Messages & media', icon: MessageCircle },
  { name: 'Language & region', icon: Globe, disable: true },
  // { name: 'Accessibility', icon: Keyboard },
  // { name: 'Mark as read', icon: Check },
  // { name: 'Audio & video', icon: Video },
  // { name: 'Connected accounts', icon: Link },
  { name: 'Privacy & visibility', icon: Lock, disable: true },
  { name: 'Advanced', icon: Settings, disable: true },
];

// Use composable for global modal control
const { isSettingsOpen, settingsActiveTab } = useSettingsModal();

const activeNavName = ref(settingNavs[0].name);
const activeNav = ref(settingNavs[0].component);

// Watch for external tab changes
watch(settingsActiveTab, newTab => {
  const nav = settingNavs.find(n => n.name === newTab);
  if (nav && !nav.disable) {
    activeNavName.value = nav.name;
    activeNav.value = nav.component;
  }
});

useHotkeys([
  {
    callback: () => (isSettingsOpen.value = !isSettingsOpen.value),
    key: 'meta+,',
  },
]);

// Handle sidebar item click
const handleNavClick = async ({
  name,
  component,
  disable,
}: (typeof settingNavs)[number]) => {
  if (disable) {
    return;
  }

  activeNavName.value = name;

  activeNav.value = component;
};
</script>

<template>
  <Dialog v-model:open="isSettingsOpen">
    <DialogContent
      class="overflow-hidden p-0 max-h-[80vh] md:max-w-[60vw] lg:max-w-[60vw]"
    >
      <SidebarProvider class="items-start">
        <Sidebar collapsible="none" class="flex">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem
                    class="cursor-pointer"
                    v-for="item in settingNavs"
                    :key="item.name"
                    :disabled="item.disable"
                  >
                    <SidebarMenuButton
                      as-child
                      :is-active="item.name === activeNavName"
                      @click="handleNavClick(item)"
                      :class="[
                        item.disable && 'cursor-not-allowed opacity-60',
                        item.name === activeNavName && 'border',
                      ]"
                    >
                      <a>
                        <component :is="item.icon" />
                        <span>{{ item.name }}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main class="flex h-[80vh] flex-1 flex-col overflow-hidden">
          <header
            class="flex h-10 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
          >
            <div class="flex items-center gap-2 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem class="md:block"> Settings </BreadcrumbItem>
                  <BreadcrumbSeparator class="md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{{ activeNavName }}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
            <div
              class="aspect-video w-full h-full rounded-xl p-2"
              tabindex="-1"
            >
              <component :is="activeNav" />
            </div>
          </div>
        </main>
      </SidebarProvider>
    </DialogContent>
  </Dialog>
</template>
