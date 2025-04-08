<script setup lang="ts">
import { ChevronRight, File, Folder, FolderOpen } from "lucide-vue-next";
import type { SidebarProps } from "../ui/sidebar";
import Tree from "../Tree.vue";
const props = defineProps<SidebarProps>();
// This is sample data.
const data = {
  changes: [
    {
      file: "README.md",
      state: "M",
    },
    {
      file: "api/hello/route.ts",
      state: "U",
    },
    {
      file: "app/layout.tsx",
      state: "M",
    },
  ],
  tree: [
    [
      "app",
      [
        "api",
        ["hello", ["route.ts"]],
        "page.tsx",
        "layout.tsx",
        ["blog", ["page.tsx"]],
      ],
    ],
    [
      "components",
      ["ui", "button1.tsx", "card.tsx"],
      "header.tsx",
      "footer.tsx",
    ],
    ["lib", ["util.ts"]],
    ["public", "favicon.ico", "vercel.svg"],
    ".eslintrc.json",
    ".gitignore",
    "next.config.js",
    "tailwind.config.js",
    "package.json",
    "README.md",
  ],
};
</script>

<template>
  <div class="w-full h-full">
    <Collapsible
      class="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90 [&[data-state=open]>button>#folder]:hidden [&[data-state=open]>button>#open-folder]:block"
    >
      <CollapsibleTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="w-full flex gap-1 justify-start items-center"
        >
          <ChevronRight class="transition-transform" />
          <Folder id="folder" />
          <FolderOpen id="open-folder" class="hidden" />
          <div class="truncate">App</div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          <Tree
            v-for="(subItem, index) in data.tree"
            :key="index"
            :item="subItem"
          />
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>

    <!-- <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Files</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <Tree
              v-for="(item, index) in data.tree"
              :key="index"
              :item="item"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent> -->
  </div>
</template>
