<script setup lang="ts">
import { ContextMenuItemType, type ContextMenuItem } from './menuContext.type';

defineProps<{
  contextMenuItems: ContextMenuItem[];
}>();

const emits = defineEmits<{
  (e: 'onClearContextMenu'): void;
}>();

const paserCondition = (condition?: boolean | undefined) => {
  if (typeof condition === 'undefined') {
    return true;
  }

  return !!condition;
};

const onMenuContextOpenChange = (open: boolean) => {
  if (!open) {
    emits('onClearContextMenu');
  }
};
</script>

<template>
  <ContextMenu @update:open="onMenuContextOpenChange">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>

    <ContextMenuContent class="min-w-56">
      <template v-for="(item, index) in contextMenuItems" :key="index">
        <ContextMenuLabel
          v-if="
            item.type === ContextMenuItemType.LABEL &&
            paserCondition(item.condition)
          "
          class="font-medium text-xs text-muted-foreground"
        >
          {{ item.title }}
        </ContextMenuLabel>

        <ContextMenuItem
          v-else-if="
            item.type === ContextMenuItemType.ACTION &&
            paserCondition(item.condition)
          "
          @select="item.select"
          :disabled="item.disabled"
        >
          <Icon
            v-if="item.icon"
            :name="item.icon"
            class="size-4! min-w-4 text-muted-foreground"
          />
          {{ item.title }}
        </ContextMenuItem>

        <ContextMenuSeparator
          v-else-if="
            item.type === ContextMenuItemType.SEPARATOR &&
            paserCondition(item.condition)
          "
        />

        <ContextMenuSub
          v-else-if="
            item.type === ContextMenuItemType.SUBMENU &&
            paserCondition(item.condition)
          "
          :disabled="!item.items || item.items.length === 0"
        >
          <ContextMenuSubTrigger>
            <Icon
              v-if="item.icon"
              :name="item.icon"
              class="size-4! min-w-4 text-muted-foreground mr-2"
            />
            {{ item.title }}
            <span v-if="item.desc" class="text-xs text-muted-foreground ml-2">
              {{ item.desc }}
            </span>
          </ContextMenuSubTrigger>

          <ContextMenuSubContent :class="'min-w-52'">
            <template v-for="(subItem, subIndex) in item.items" :key="subIndex">
              <ContextMenuItem
                v-if="
                  subItem.type === ContextMenuItemType.ACTION &&
                  paserCondition(subItem.condition)
                "
                @select="subItem.select"
              >
                <Icon
                  v-if="subItem.icon"
                  :name="subItem.icon"
                  class="size-4! min-w-4 text-muted-foreground"
                />
                {{ subItem.title }}
              </ContextMenuItem>

              <ContextMenuLabel
                v-else-if="
                  subItem.type === ContextMenuItemType.LABEL &&
                  paserCondition(subItem.condition)
                "
                class="font-medium text-xs text-muted-foreground"
              >
                {{ subItem.title }}
              </ContextMenuLabel>

              <ContextMenuSeparator
                v-else-if="
                  subItem.type === ContextMenuItemType.SEPARATOR &&
                  paserCondition(subItem.condition)
                "
              />
            </template>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </template>
    </ContextMenuContent>
  </ContextMenu>
</template>
