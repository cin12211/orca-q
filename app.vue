<template>
  <Titlebar />

  <!-- <button
    @click="panelRef?.isCollapsed ? panelRef?.expand() : panelRef?.collapse()"
  >
    {{ panelRef?.isCollapsed ? "Expand" : "Collapse" }}
  </button> -->

  <ResizablePanelGroup
    id="demo-group-1"
    direction="horizontal"
    class="w-screen"
    :keyboardResizeBy="10"
    auto-save-id="demo-panel-1"
  >
    <ResizablePanel
      id="demo-panel-1"
      :collapsible="true"
      :collapsed-size="5"
      :min-size="10"
      ref="panelRef"
    >
      <div class="h-screen">
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </div>
    </ResizablePanel>
    <ResizableHandle id="demo-handle-1" />
    <ResizablePanel id="demo-panel-2">
      <div>hello ni</div>
    </ResizablePanel>
  </ResizablePanelGroup>

  <!-- <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
      >
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div class="grid auto-rows-min gap-4 md:grid-cols-3">
          <div class="aspect-video rounded-xl bg-muted/50" />
          <div class="aspect-video rounded-xl bg-muted/50" />
          <div class="aspect-video rounded-xl bg-muted/50" />
        </div>
        <div class="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </SidebarInset>
  </SidebarProvider> -->

  <!-- <div>
    <Button> hello</Button>
    <FileExplored />
  </div> -->
</template>
<script setup lang="ts">
import type { SplitterPanel } from "reka-ui";
import AppSidebar from "./components/sidebar-global/AppSidebar.vue";
import Titlebar from "./components/Titlebar.vue";

const { data } = await useFetch("/api/hello");

const panelRef = ref<InstanceType<typeof SplitterPanel>>();
</script>

<style>
@import url("./assets/global.css");
</style>
