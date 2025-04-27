<script setup lang="ts">
import { NuxtLink } from '#components';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/shared/stores/useActivityBarStore';

const activityStore = useActivityBarStore();

// This is sample data
const activity = computed(() => [
  {
    id: ActivityBarItemType.Explorer,
    title: 'Files',
    icon: 'hugeicons:files-02',
    isActive: activityStore.activityActive === ActivityBarItemType.Explorer,
  },
  {
    id: ActivityBarItemType.Schemas,
    title: 'Schemas',
    icon: 'hugeicons:chart-relationship',
    isActive: activityStore.activityActive === ActivityBarItemType.Schemas,
  },
]);

// TODO: update
const user = {
  name: 'shadcn',
  email: 'm@example.com',
  avatar: '/avatars/shadcn.jpg',
};

const colorMode = useColorMode();
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <div
      class="max-w-12 min-w-12 border-r py-2 bg-sidebar-accent"
      v-auto-animate
    >
      <div class="flex flex-col justify-between h-full space-y-2">
        <div class="flex flex-col items-center space-y-2">
          <Tooltip v-for="item in activity">
            <TooltipTrigger as-child>
              <Button
                size="icon"
                :variant="item.isActive ? 'default' : 'ghost'"
                @click="activityStore.setActivityActive(item.id)"
              >
                <Icon :name="item.icon" class="size-6!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ item.title }}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div class="flex flex-col gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button size="icon" variant="ghost">
                <Icon
                  name="hugeicons:moon-02"
                  class="size-6! rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                />
                <Icon
                  name="hugeicons:sun-03"
                  class="size-6! absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              :side="'right'"
              align="end"
              :side-offset="4"
            >
              <DropdownMenuItem
                @click="colorMode.preference = 'light'"
                class="cursor-pointer"
              >
                <Icon name="hugeicons:sun-03" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem
                @click="colorMode.preference = 'dark'"
                class="cursor-pointer"
              >
                <Icon name="hugeicons:moon-02" />

                Dark
              </DropdownMenuItem>
              <DropdownMenuItem
                @click="colorMode.preference = 'system'"
                class="cursor-pointer"
              >
                <Icon name="hugeicons:solar-system" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button size="icon" variant="ghost">
                <Icon name="hugeicons:settings-01" class="size-6!" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              :side="'right'"
              align="end"
              :side-offset="4"
            >
              <DropdownMenuLabel class="p-0 font-normal">
                <div
                  class="flex items-center gap-2 px-1 py-1.5 text-left text-sm"
                >
                  <Avatar class="h-8 w-8 rounded-lg">
                    <AvatarImage :src="user.avatar" :alt="user.name" />
                    <AvatarFallback class="rounded-lg"> CN </AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-medium">{{ user.name }}</span>
                    <span class="truncate text-xs">{{ user.email }}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <!-- <Sparkles /> -->
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <!-- <BadgeCheck /> -->
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <!-- <CreditCard /> -->
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <!-- <Bell /> -->
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <!-- <LogOut /> -->
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>
