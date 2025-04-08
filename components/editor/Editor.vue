<template>
  <DynamicTable :data="executeResultData" />

  <div class="w-full h-full">
    <div id="container-monaco-editor" class="h-full"></div>
  </div>
</template>

<script lang="ts" setup>
import * as monaco from "monaco-editor";
import DynamicTable from "../secondary-side-bar/DynamicTable.vue";

const monacoEditor = shallowRef<monaco.editor.IStandaloneCodeEditor>();

onMounted(() => {
  const container = document.getElementById(
    "container-monaco-editor"
  ) as HTMLElement;

  if (!container) {
    console.error("Monaco Editor container not found");
    return;
  }

  monacoEditor.value = monaco.editor.create(container, {
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  });

  monacoEditor.value?.addAction({
    id: "execute-query",
    label: "Execute query",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    precondition: undefined,
    keybindingContext: undefined,
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1.5,
    run: function (ed) {
      const code = ed.getValue();
      console.log("Executing query:", code);

      executeQuery(code);
    },
  });
});

let executeResultData = ref<Record<string, any>[]>([]);

const executeQuery = async (query: string) => {
  try {
    const data = await $fetch("/api/execute", {
      method: "POST",
      body: { query },
    });

    executeResultData.value = data.result;
  } catch (error) {
    console.error("Error:", error);
  }
};

onUnmounted(() => {
  monacoEditor.value?.dispose();
});
</script>
