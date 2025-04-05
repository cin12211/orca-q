<template>
  <div class="tree-item" :style="{ paddingLeft: `${level * 8}px` }">
    <div
      class="item-content"
      :class="{ 'is-folder': isFolder, 'is-expanded': isExpanded }"
      @click="handleClick"
    >
      <span class="chevron" v-if="isFolder">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ rotated: isExpanded }"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </span>
      <span class="icon" :class="iconClass">
        <component :is="getIcon()" />
      </span>
      <span class="name">{{ item.name }}</span>
    </div>

    <div v-if="isFolder && isExpanded" class="children">
      <TreeItem
        v-for="child in (item as FolderItem).children "
        :key="child.id"
        :item="child"
        :level="level + 1"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from "vue";
import { TreeItemType } from "./types";

// Define props
const props = defineProps<{
  item: TreeItemType;
  level: number;
}>();

// Define emits
const emit = defineEmits<{
  (e: "toggle", folderId: string): void;
}>();

const isFolder = computed(() => "children" in props.item);
const isExpanded = computed(
  () => isFolder.value && "expanded" in props.item && props.item.expanded
);

const iconClass = computed(() => {
  switch (props.item.type) {
    case TreeItemType.FOLDER:
      return "folder-icon";
    case TreeItemType.CONFIG_FOLDER:
      return "config-folder-icon";
    case TreeItemType.SRC_FOLDER:
      return "src-folder-icon";
    case TreeItemType.APP_FOLDER:
      return "app-folder-icon";
    case TreeItemType.ROUTES_FOLDER:
      return "routes-folder-icon";
    case TreeItemType.TYPES_FOLDER:
      return "types-folder-icon";
    case TreeItemType.PAGES_FOLDER:
      return "pages-folder-icon";
    case TreeItemType.TS:
      return "ts-icon";
    case TreeItemType.TSX:
      return "tsx-icon";
    default:
      return "";
  }
});

const getIcon = () => {
  // Return different SVG icons based on item type
  if (isFolder.value) {
    if (isExpanded.value) {
      // Folder open icon
      return h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "16",
          height: "16",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        [
          h("path", {
            d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
          }),
        ]
      );
    } else {
      // Folder closed icon
      return h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "16",
          height: "16",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        [
          h("path", {
            d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
          }),
        ]
      );
    }
  } else if (props.item.type === TreeItemType.TS) {
    // TS file icon
    return h(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
      },
      [
        h(
          "text",
          {
            x: "6",
            y: "16",
            "font-size": "12",
            fill: "#3178c6",
          },
          "TS"
        ),
      ]
    );
  } else if (props.item.type === TreeItemType.TSX) {
    // TSX file icon
    return h(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
      },
      [
        h("circle", {
          cx: "12",
          cy: "12",
          r: "8",
          fill: "#3178c6",
          "fill-opacity": "0.2",
        }),
        h(
          "text",
          {
            x: "4",
            y: "16",
            "font-size": "10",
            fill: "#3178c6",
          },
          "TSX"
        ),
      ]
    );
  }

  // Default file icon
  return h(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    [
      h("path", {
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
      }),
      h("polyline", { points: "14 2 14 8 20 8" }),
    ]
  );
};

const handleClick = () => {
  if (isFolder.value) {
    emit("toggle", props.item.id);
  }
};
</script>

<style scoped>
.tree-item {
  font-size: 13px;
}

.item-content {
  display: flex;
  align-items: center;
  height: 22px;
  cursor: pointer;
  border-radius: 3px;
  padding-right: 8px;
}

.item-content:hover {
  background-color: #2a2d2e;
}

.chevron {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c5c5c5;
}

.chevron svg {
  transition: transform 0.1s ease;
}

.chevron svg.rotated {
  transform: rotate(90deg);
}

.icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 4px;
}

.folder-icon {
  color: #e8ab53;
}

.config-folder-icon {
  color: #42a5f5;
}

.src-folder-icon,
.app-folder-icon,
.routes-folder-icon,
.types-folder-icon,
.pages-folder-icon {
  color: #4caf50;
}

.ts-icon {
  color: #3178c6;
}

.tsx-icon {
  color: #3178c6;
}

.name {
  margin-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.children {
  margin-left: 8px;
}
</style>
