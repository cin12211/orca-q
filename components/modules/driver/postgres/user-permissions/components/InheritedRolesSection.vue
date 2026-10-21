<script setup lang="ts">
import type { RoleInheritanceNode } from '~/core/types';

defineProps<{
  inheritedRoles: RoleInheritanceNode[];
  isLoading: boolean;
}>();
</script>

<template>
  <div class="px-4 pt-0 pb-3">
    <Collapsible :default-open="true">
      <template #default="{ open }">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex items-center gap-2">
            <Icon
              name="lucide:git-branch"
              class="size-4 text-muted-foreground"
            />
            <p class="text-sm font-medium">Inherited from</p>
          </div>

          <CollapsibleTrigger as-child>
            <div
              variant="secondary"
              class="text-xs cursor-pointer text-muted-foreground flex items-center gap-1"
            >
              <span class="text-xs ml-1">{{
                open ? `Collapse` : `Expand`
              }}</span>

              <Icon
                name="lucide:chevron-down"
                :class="['size-4 transition-transform', open && 'rotate-180']"
              />
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div
            v-if="isLoading"
            class="flex items-center gap-2 text-muted-foreground"
          >
            <Icon name="hugeicons:loading-03" class="size-4 animate-spin" />
            <span class="text-sm">Loading inheritance...</span>
          </div>
          <div
            v-else-if="inheritedRoles.length === 0"
            class="text-sm text-muted-foreground"
          >
            No inherited roles
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="(role, index) in inheritedRoles"
              :key="`${role.roleName}-${index}`"
              class="flex items-center text-sm gap-1 hover:bg-accent rounded-sm"
              :style="{ paddingLeft: `${role.depth * 16}px` }"
            >
              <Icon
                name="lucide:corner-down-right"
                class="size-3 text-muted-foreground"
              />
              <span>{{ role.roleName }}</span>
            </div>
          </div>
        </CollapsibleContent>
      </template>
    </Collapsible>
  </div>
</template>
