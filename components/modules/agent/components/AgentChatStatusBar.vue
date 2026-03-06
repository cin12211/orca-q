<script setup lang="ts">
import { ref } from 'vue';

const selectedLocal = ref('Local 3%');
const selectedPerms = ref('Default permissions');
const selectedBranch = ref('feat/self-control-db-conn...');

const locals = ['Local 3%', 'Local 50%', 'Local 100%'];
const perms = ['Default permissions', 'Read-only', 'Admin access'];
const branches = [
  'main',
  'feat/self-control-db-conn...',
  'fix/parser-bug',
  'chore/update-deps',
];
</script>

<template>
  <div
    class="flex items-center justify-between px-4 mt-2 text-[12px] text-muted-foreground relative z-30"
  >
    <div class="flex items-center gap-6">
      <!-- Local Dropdown -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            class="flex items-center gap-1.5 hover:text-foreground transition-colors outline-none cursor-pointer"
          >
            <Icon name="lucide:folder" class="size-3.5 stroke-[1.5]" />
            <span>{{ selectedLocal }}</span>
            <Icon name="lucide:chevron-down" class="size-3 stroke-[2]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-40 rounded-xl">
          <DropdownMenuItem
            v-for="loc in locals"
            :key="loc"
            class="text-[13px] cursor-pointer flex justify-between items-center"
            @click="selectedLocal = loc"
          >
            <span :class="selectedLocal === loc ? 'font-medium' : ''">{{
              loc
            }}</span>
            <Icon
              v-if="selectedLocal === loc"
              name="lucide:check"
              class="size-4"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Permissions Dropdown -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            class="flex items-center gap-1.5 hover:text-foreground transition-colors outline-none cursor-pointer"
          >
            <Icon name="lucide:shield" class="size-3.5 stroke-[1.5]" />
            <span>{{ selectedPerms }}</span>
            <Icon name="lucide:chevron-down" class="size-3 stroke-[2]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-48 rounded-xl">
          <DropdownMenuItem
            v-for="perm in perms"
            :key="perm"
            class="text-[13px] cursor-pointer flex justify-between items-center"
            @click="selectedPerms = perm"
          >
            <span :class="selectedPerms === perm ? 'font-medium' : ''">{{
              perm
            }}</span>
            <Icon
              v-if="selectedPerms === perm"
              name="lucide:check"
              class="size-4"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Branch Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          class="flex items-center gap-1.5 hover:text-foreground transition-colors outline-none cursor-pointer"
        >
          <Icon name="lucide:git-branch" class="size-3.5 stroke-[1.5]" />
          <span class="max-w-[150px] truncate">{{ selectedBranch }}</span>
          <Icon name="lucide:chevron-down" class="size-3 stroke-[2]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56 rounded-xl">
        <DropdownMenuItem
          v-for="branch in branches"
          :key="branch"
          class="text-[13px] cursor-pointer flex justify-between items-center"
          @click="selectedBranch = branch"
        >
          <span
            :class="[
              'truncate mr-2',
              selectedBranch === branch ? 'font-medium' : '',
            ]"
            >{{ branch }}</span
          >
          <Icon
            v-if="selectedBranch === branch"
            name="lucide:check"
            class="size-4 shrink-0"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
