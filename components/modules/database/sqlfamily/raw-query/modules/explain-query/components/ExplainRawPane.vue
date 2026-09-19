<script setup lang="ts">
import { computed } from 'vue';
import type { SupportedLanguage } from '~/core/composables/useSqlHighlighter';

const props = defineProps<{
  rawText: string;
}>();

const language = computed<SupportedLanguage>(() => {
  const text = props.rawText.trim();
  return text.startsWith('{') || text.startsWith('[') ? 'json' : 'sql';
});
</script>

<template>
  <div class="h-full overflow-auto p-2">
    <CodeHighlightPreview
      :code="rawText"
      :language="language"
      max-height="100%"
    />
  </div>
</template>
