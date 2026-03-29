<script setup lang="ts">
import { ref, watch, type Component } from 'vue';
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
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import { isTauri } from '~/core/helpers/environment';
import {
  AgentConfig,
  AppearanceConfig,
  BackupRestoreConfig,
  DesktopConfig,
  EditorConfig,
  QuickQueryConfig,
  TableAppearanceConfig,
} from '../components';
import { SETTINGS_NAV_ITEMS } from '../constants';
import { SettingsComponentKey } from '../types';

const SETTINGS_COMPONENTS: Record<SettingsComponentKey, Component> = {
  DesktopConfig,
  EditorConfig,
  QuickQueryConfig,
  AgentConfig,
  AppearanceConfig,
  TableAppearanceConfig,
  BackupRestoreConfig,
};

const settingNavs = SETTINGS_NAV_ITEMS.filter(
  item => !item.desktopOnly || isTauri()
).map(item => ({
  ...item,
  component: item.componentKey ? SETTINGS_COMPONENTS[item.componentKey] : null,
}));

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
  <Dialog v-if="isSettingsOpen" v-model:open="isSettingsOpen">
    <DialogContent
      class="overflow-hidden p-0 max-h-[85vh] md:max-w-[70vw] lg:max-w-[70vw]"
    >
      <SidebarProvider class="items-start">
        <Sidebar collapsible="none" class="flex">
          <SidebarContent class="p-3">
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
                        <Icon :name="item.icon" class="size-4!" />
                        <span>{{ item.name }}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main class="flex h-[85vh] py-3 flex-1 flex-col overflow-y-auto">
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
          <div class="flex flex-1 flex-col gap-4 p-4 mr-4 pr-0 pt-0">
            <div
              class="aspect-video w-full h-full rounded-xl p-2 px-0"
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
