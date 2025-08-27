<script setup lang="ts">
import { useActivityMenu } from './activityMenu';

const { activity, onChangeActivity } = useActivityMenu();

// TODO: update
const user = {
  name: 'shadcn',
  email: 'm@example.com',
  avatar: '/avatars/shadcn.jpg',
};

const colorMode = useColorMode();
</script>

<template>
  <div class="max-w-9 min-w-9 py-2" v-auto-animate>
    <div class="flex flex-col justify-between h-full space-y-2">
      <div class="flex flex-col items-center gap-1">
        <Tooltip v-for="item in activity">
          <TooltipTrigger as-child>
            <Button
              size="iconMd"
              :variant="item.isActive ? 'default' : 'ghost'"
              @click="onChangeActivity(item.id, true)"
            >
              <Icon :name="item.icon" class="size-5!" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{{ item.title }}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- TODO: OPEN when Implement theme -->
      <!-- TODO: OPEN when do setting feature -->

      <div class="flex flex-col gap-1" v-if="false">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button size="iconMd" variant="ghost">
              <Icon
                name="hugeicons:moon-02"
                class="size-5! rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              />
              <Icon
                name="hugeicons:sun-03"
                class="size-5! absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
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
            <Button size="iconMd" variant="ghost">
              <Icon name="hugeicons:settings-01" class="size-5!" />
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
</template>
