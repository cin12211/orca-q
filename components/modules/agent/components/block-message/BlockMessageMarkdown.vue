<script setup lang="ts">
import { computed, toRef } from 'vue';
import { marked } from 'marked';
import { useSmoothStream } from '~/core/composables/useSmoothStream';

const props = defineProps<{
  content: string;
  isBlockStreaming?: boolean;
  isStreaming?: boolean;
  isUserMessage?: boolean;
}>();

const isCurrentlyStreaming = computed(
  () => !!(props.isBlockStreaming && props.isStreaming)
);
const smoothedContent = useSmoothStream(
  toRef(props, 'content'),
  isCurrentlyStreaming
);

// Computed ensures re-parsing only when smoothedContent ref changes,
// not on every animation frame tick.
const renderedHtml = computed(
  () => marked.parse(smoothedContent.value, { async: false }) as string
);
</script>

<template>
  <div data-markdown="" v-html="renderedHtml" />

  <div
    v-if="isBlockStreaming && isStreaming && !isUserMessage"
    class="inline-flex h-3.5 w-1.5 animate-pulse rounded-xs bg-foreground"
  />
</template>

<style>
@reference "~/assets/css/tailwind.css";

/* TODO use @plugin "@tailwindcss/typography"; 
class="prose prose-sm max-w-none prose-p:my-1.5 prose-p:text-[13px] prose-p:leading-normal prose-pre:my-3 prose-pre:rounded-lg prose-pre:bg-slate-950 prose-pre:px-4 prose-pre:py-3 prose-pre:text-slate-100 prose-ul:my-1.5 prose-ul:pl-5 prose-ul:space-y-0.5 prose-ol:my-1.5 prose-headings:mt-3 prose-headings:mb-2 prose-code:bg-muted/50 prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:font-mono dark:prose-invert"
or custom
 */

[data-markdown] h1 {
  @apply mt-0 mb-4 text-3xl font-bold;
}

[data-markdown] h2 {
  @apply mt-8 mb-3 text-2xl font-semibold;
}

[data-markdown] h3 {
  @apply mt-6 mb-2 text-xl font-semibold;
}

[data-markdown] h4 {
  @apply mt-5 mb-2 text-lg font-semibold;
}

[data-markdown] h5 {
  @apply mt-4 mb-1 text-base font-semibold;
}

[data-markdown] h6 {
  @apply mt-4 mb-1 text-sm font-semibold tracking-wider uppercase;
}

/* =========================
   PARAGRAPH
========================= */

[data-markdown] p {
  @apply mb-1.5 leading-5;
}

/* =========================
   LINKS
========================= */

[data-markdown] a {
  @apply underline underline-offset-2 transition-colors hover:text-blue-500;
}

/* =========================
   LIST
========================= */

[data-markdown] ul {
  @apply mb-4 list-disc pl-6;
}

[data-markdown] ol {
  @apply mb-4 list-decimal pl-6;
}

[data-markdown] li {
  @apply mb-1;
}

[data-markdown] li::marker {
  color: var(--muted-foreground);
}

/* nested list */

[data-markdown] ul ul,
[data-markdown] ol ul {
  @apply list-disc;
}

[data-markdown] ul ol,
[data-markdown] ol ol {
  @apply list-decimal;
}

/* =========================
   BLOCKQUOTE
========================= */

[data-markdown] blockquote {
  @apply text-muted-foreground my-4 border-l-4 pl-4 italic;
}

/* =========================
   CODE
========================= */

[data-markdown] code {
  @apply bg-muted rounded px-1.5 py-0.5 font-mono text-sm;
}

[data-markdown] pre {
  @apply bg-muted my-4 overflow-x-auto rounded-lg p-4;
}

[data-markdown] pre code {
  @apply bg-transparent p-0;
}

/* =========================
   TABLE
========================= */

[data-markdown] table {
  @apply my-6 w-full border-collapse text-sm;
}

[data-markdown] thead {
  @apply border-b;
}

[data-markdown] th {
  @apply p-2 text-left font-semibold;
}

[data-markdown] td {
  @apply p-2 align-top;
}

[data-markdown] tr {
  @apply border-b;
}

/* =========================
   IMAGE
========================= */

[data-markdown] img {
  @apply my-4 max-w-full rounded-lg;
}

/* =========================
   HR
========================= */

[data-markdown] hr {
  @apply my-8 border-t;
}

/* =========================
   STRONG / EMPHASIS
========================= */

[data-markdown] strong {
  @apply font-semibold;
}

[data-markdown] em {
  @apply italic;
}

/* =========================
   TASK LIST (GitHub style)
========================= */

[data-markdown] input[type='checkbox'] {
  @apply mr-2;
}
</style>
