<template>
  <div class="explorer-container">
    <!-- Left sidebar icons -->
    <div class="sidebar-icons">
      <div class="icon-item active">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
            />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
            />
          </svg>
        </div>
        <div class="badge">2</div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
            />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            />
          </svg>
        </div>
      </div>
      <div class="icon-item">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M20 16.7a2.5 2.5 0 0 0-2.5-2.5H15v-2.5A2.5 2.5 0 0 0 12.5 9h-1V6.5A2.5 2.5 0 0 0 9 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-3.3"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Explorer sidebar -->
    <div class="explorer-sidebar">
      <div class="explorer-header">
        <span>EXPLORER</span>
        <div class="actions">
          <span>...</span>
        </div>
      </div>

      <div class="tree-view">
        <TreeItem :item="rootFolder" :level="0" @toggle="toggleFolder" />
      </div>
    </div>

    <div class="overflow-auto">hello</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TreeItem from "./TreeItem.vue";
import { TreeItemType, type FileItem, type FolderItem } from "./types";

// Create the file structure
const privateRoutesFiles: FileItem[] = [
  { id: "adminRoutes", name: "adminRoutes.tsx", type: TreeItemType.TSX },
  { id: "businessRoutes", name: "businessRoutes.tsx", type: TreeItemType.TSX },
  { id: "calendarRoutes", name: "calendarRoutes.tsx", type: TreeItemType.TSX },
  {
    id: "dashboardRoutes",
    name: "dashboardRoutes.tsx",
    type: TreeItemType.TSX,
  },
  { id: "expriedModal", name: "ExpriedModal.tsx", type: TreeItemType.TSX },
  { id: "indexPrivate", name: "index.tsx", type: TreeItemType.TSX },
  {
    id: "productionRoutes",
    name: "productionRoutes.tsx",
    type: TreeItemType.TSX,
  },
  { id: "resourceRoutes", name: "resourceRoutes.tsx", type: TreeItemType.TSX },
  { id: "salesRoutes", name: "salesRoutes.tsx", type: TreeItemType.TSX },
  { id: "seasonRoutes", name: "seasonRoutes.tsx", type: TreeItemType.TSX },
  { id: "settingsRoutes", name: "settingsRoutes.tsx", type: TreeItemType.TSX },
  { id: "statsRoutes", name: "statsRoutes.tsx", type: TreeItemType.TSX },
  { id: "teamRoutes", name: "teamRoutes.tsx", type: TreeItemType.TSX },
  {
    id: "withoutPrivateLayoutRoutes",
    name: "withoutPrivateLayoutRoutes.tsx",
    type: TreeItemType.TSX,
  },
];

const publicRoutesFiles: FileItem[] = [
  { id: "indexPublic", name: "index.tsx", type: TreeItemType.TSX },
];

const calendarFiles: FileItem[] = [
  {
    id: "appointmentsManagement",
    name: "AppointmentsManagementPage.tsx",
    type: TreeItemType.TSX,
  },
  {
    id: "calendarNavigator",
    name: "CalendarNavigatorPage.tsx",
    type: TreeItemType.TSX,
  },
];

// Build the folder structure
const rootFolder = ref<FolderItem>({
  id: "root",
  name: "SIMON-WEB",
  type: TreeItemType.FOLDER,
  expanded: true,
  children: [
    {
      id: "husky",
      name: ".husky",
      type: TreeItemType.CONFIG_FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "vite",
      name: ".vite",
      type: TreeItemType.FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "vscode",
      name: ".vscode lorem loremloremloremloremloremlorem loremloremloremloremloremlorem ",
      type: TreeItemType.CONFIG_FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "build",
      name: "build",
      type: TreeItemType.FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "docs",
      name: "docs",
      type: TreeItemType.FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "public",
      name: "public",
      type: TreeItemType.FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "scripts",
      name: "scripts",
      type: TreeItemType.FOLDER,
      expanded: false,
      children: [],
    },
    {
      id: "src",
      name: "src",
      type: TreeItemType.SRC_FOLDER,
      expanded: true,
      children: [
        {
          id: "types",
          name: "@types",
          type: TreeItemType.TYPES_FOLDER,
          expanded: false,
          children: [],
        },
        {
          id: "app",
          name: "app",
          type: TreeItemType.APP_FOLDER,
          expanded: true,
          children: [
            {
              id: "features",
              name: "features",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "mobile",
              name: "mobile",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "routes",
              name: "routes",
              type: TreeItemType.ROUTES_FOLDER,
              expanded: true,
              children: [
                {
                  id: "mobileRoutes",
                  name: "mobileRoutes",
                  type: TreeItemType.FOLDER,
                  expanded: false,
                  children: [],
                },
                {
                  id: "modalRoutes",
                  name: "modalRoutes",
                  type: TreeItemType.FOLDER,
                  expanded: false,
                  children: [],
                },
                {
                  id: "privateRoutes",
                  name: "privateRoutes",
                  type: TreeItemType.FOLDER,
                  expanded: true,
                  children: privateRoutesFiles,
                },
                {
                  id: "publicRoutes",
                  name: "publicRoutes",
                  type: TreeItemType.FOLDER,
                  expanded: false,
                  children: publicRoutesFiles,
                },
                { id: "utils", name: "utils.ts", type: TreeItemType.TS },
                { id: "main", name: "main.tsx", type: TreeItemType.TSX },
              ],
            },
          ],
        },
        {
          id: "lib",
          name: "lib",
          type: TreeItemType.FOLDER,
          expanded: false,
          children: [],
        },
        {
          id: "pages",
          name: "pages",
          type: TreeItemType.PAGES_FOLDER,
          expanded: true,
          children: [
            {
              id: "admin",
              name: "Admin",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "auth",
              name: "Auth",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "business",
              name: "Business",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "calendar",
              name: "Calendar",
              type: TreeItemType.FOLDER,
              expanded: true,
              children: calendarFiles,
            },
            {
              id: "clients",
              name: "Clients",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "dashboard",
              name: "Dashboard",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
            {
              id: "marketingSessionReport",
              name: "MarketingSessionReport",
              type: TreeItemType.FOLDER,
              expanded: false,
              children: [],
            },
          ],
        },
      ],
    },
  ],
});

// Function to toggle folder expansion
const toggleFolder = (folderId: string) => {
  const findAndToggle = (items: (FolderItem | FileItem)[]): boolean => {
    for (const item of items) {
      if (item.id === folderId && "expanded" in item) {
        item.expanded = !item.expanded;
        return true;
      }

      if ("children" in item && item.children.length > 0) {
        if (findAndToggle(item.children)) {
          return true;
        }
      }
    }
    return false;
  };

  findAndToggle([rootFolder.value]);
};
</script>

<style scoped>
.explorer-container {
  display: flex;
  height: 100vh;
  color: #e1e1e1;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  font-size: 13px;
}

.sidebar-icons {
  width: 48px;
  background-color: #252526;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}

.icon-item {
  width: 48px;
  height: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  color: #858585;
}

.icon-item.active {
  color: #ffffff;
}

.icon-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background-color: #ffffff;
}

.icon {
  width: 24px;
  height: 24px;
}

.badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #4d4d4d;
  color: #ffffff;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.explorer-sidebar {
  width: 300px;
  background-color: #1e1e1e;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.explorer-header {
  padding: 0 20px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 11px;
  color: #bbbbbb;
  letter-spacing: 0.5px;
}

.actions {
  cursor: pointer;
}

.tree-view {
  padding: 0 8px;
}
</style>
