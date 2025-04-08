<script lang="ts">
export const description = "Collapsible nested sidebars.";
export const iframeHeight = "800px";
</script>

<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
</script>

<template>
  <!-- <SidebarProvider
    :style="{
      '--sidebar-width': '350px',
    }"
  > -->
  <!-- <AppSidebar /> -->
  <!-- <SidebarInset> -->

  <div class="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
    <div
      v-for="index in 24"
      :key="index"
      class="aspect-video h-12 w-full rounded-lg bg-muted/50"
    />
  </div>
  <!-- </SidebarInset> -->
  <!-- </SidebarProvider> -->
</template>
