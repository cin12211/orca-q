<template>
  <div
    class="p-4 flex flex-col items-center justify-center h-full text-center space-y-4"
  >
    <!-- Logo -->
    <Avatar class="rounded-2xl size-20 shadow-md">
      <AvatarImage src="/logo.png" alt="@unovue" />
    </Avatar>

    <!-- Instructions -->
    <div class="text-muted-foreground space-y-3">
      <h2 class="text-lg font-normal text-foreground">Getting Started</h2>
      <ol class="list-disc list-inside text-left space-y-2">
        <li>
          <span class="font-normal text-foreground">Write your query</span> in
          the editor.
        </li>
        <li>
          <span class="font-normal text-foreground"
            >Click inside your query</span
          >
          to select it.
        </li>
        <li>
          Click
          <span class="text-foreground font-normal">'Execute current'</span>
          or use shortcut
          <ContextMenuShortcut
            class="font-normal border rounded-md p-1 px-1.5 text-foreground"
            >⌘↵</ContextMenuShortcut
          >
          to run the query.
        </li>
      </ol>
    </div>
  </div>
</template>
