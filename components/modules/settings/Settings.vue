<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#components';
import {
  Bell,
  Check,
  Globe,
  Home,
  Keyboard,
  Link,
  Lock,
  Menu,
  MessageCircle,
  Paintbrush,
  Settings,
  Video,
} from 'lucide-vue-next';

const settingNavs = [
  { name: 'Notifications', icon: Bell },
  { name: 'Navigation', icon: Menu },
  { name: 'Home', icon: Home },
  { name: 'Appearance', icon: Paintbrush },
  { name: 'Messages & media', icon: MessageCircle },
  { name: 'Language & region', icon: Globe },
  { name: 'Accessibility', icon: Keyboard },
  { name: 'Mark as read', icon: Check },
  { name: 'Audio & video', icon: Video },
  { name: 'Connected accounts', icon: Link },
  { name: 'Privacy & visibility', icon: Lock },
  { name: 'Advanced', icon: Settings },
];

const isOpenSettingModal = ref(false);
const activeNav = ref('Messages & media');

//TODO: open setting modal
// useHotkeys([
//   {
//     callback: () => (isOpenSettingModal.value = !isOpenSettingModal.value),
//     key: 'meta+,',
//   },
// ]);

// Scroll to active sidebar item on mount
onMounted(async () => {
  await nextTick();
  const activeItem = document.querySelector(
    '.sidebar-menu-item [is-active="true"]'
  )?.parentElement;
  if (activeItem) {
    activeItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
});

// Handle sidebar item click
const handleNavClick = async (navName: string) => {
  activeNav.value = navName;
  await nextTick();
  const section = document.getElementById(navName);
  if (section) {
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    section.focus();
  }
};
</script>

<template>
  <Dialog v-model:open="isOpenSettingModal">
    <DialogContent
      class="overflow-hidden p-0 max-h-[80vh] md:max-w-[90vw] lg:max-w-[90vw]"
    >
      <DialogTitle class="sr-only"> Settings </DialogTitle>
      <DialogDescription class="sr-only">
        Customize your settings here.
      </DialogDescription>
      <SidebarProvider class="items-start">
        <Sidebar collapsible="none" class="hidden flex">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem
                    class="cursor-pointer"
                    v-for="item in settingNavs"
                    :key="item.name"
                  >
                    <SidebarMenuButton
                      as-child
                      :is-active="item.name === activeNav"
                      @click="handleNavClick(item.name)"
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
            class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
          >
            <div class="flex items-center gap-2 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem class="hidden md:block">
                    <BreadcrumbLink href="#"> Settings </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator class="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{{ activeNav }}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
            <div
              class="aspect-video w-full h-full rounded-xl bg-muted/50"
              tabindex="-1"
            >
              {{ activeNav }}
            </div>
          </div>
        </main>
      </SidebarProvider>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.sidebar-menu-item {
  scroll-margin-top: 1rem;
  scroll-margin-bottom: 1rem;
}
</style>
