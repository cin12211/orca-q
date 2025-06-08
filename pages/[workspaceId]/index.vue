<script setup lang="ts">
import { ContextMenuShortcut } from '#components';
import ManagementConnection from '~/components/modules/management-connection/ManagementConnection.vue';

definePageMeta({
  layout: 'default',
});
</script>

<template>
  <div class="p-2 flex flex-col items-center justify-center h-full">
    <Avatar class="rounded-2xl size-40">
      <AvatarImage src="/logo.png" alt="@unovue" />
    </Avatar>

    <div class="font-medium text-2xl pt-2">No table is open</div>
    <div class="text-muted-foreground">
      Click on a database table from the sidebar to begin

      <Icon
        name="hugeicons:artificial-intelligence-08"
        class="size-4 min-w-4"
      />
    </div>

    <div class="flex items-center pt-3 text-muted-foreground gap-0.5 text-sm">
      <Icon name="hugeicons:settings-01"> </Icon> Open setting

      <ContextMenuShortcut class="pl-2">(⌘,)</ContextMenuShortcut>
    </div>

    <div class="flex items-center pt-1 text-muted-foreground gap-0.5 text-sm">
      <Icon name="hugeicons:command" /> Command Palette

      <ContextMenuShortcut class="pl-2">(⌘K)</ContextMenuShortcut>
    </div>

    <div class="flex items-center pt-1 text-muted-foreground gap-0.5 text-sm">
      <Icon name="hugeicons:sidebar-left" /> Toggle right sidebar

      <ContextMenuShortcut class="pl-2">(⌘B)</ContextMenuShortcut>
    </div>

    <div class="flex items-center pt-1 text-muted-foreground gap-0.5 text-sm">
      <Icon name="hugeicons:sidebar-right" /> Open setting

      <ContextMenuShortcut class="pl-2">(⇧⌘B)</ContextMenuShortcut>
    </div>
  </div>
</template>
