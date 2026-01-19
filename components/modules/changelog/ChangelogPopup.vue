<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  ScrollArea,
} from '#components';
import { Sparkles } from 'lucide-vue-next';
import { marked } from 'marked';
import { useChangelogModal } from '~/shared/contexts/useChangelogModal';

const { isChangelogOpen, changelogEntries, isLoading, closeChangelog } =
  useChangelogModal();

// Convert markdown to HTML
const renderMarkdown = (content: string): string => {
  return marked.parse(content, { async: false }) as string;
};
</script>

<template>
  <Dialog
    v-model:open="isChangelogOpen"
    v-on:update:open="
      $event => {
        if (!$event) {
          closeChangelog();
        }
      }
    "
  >
    <DialogContent
      class="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col"
    >
      <DialogHeader class="flex-shrink-0">
        <div class="flex items-center gap-3">
          <div
            class="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20"
          >
            <Sparkles class="size-5 text-violet-500" />
          </div>
          <div>
            <DialogTitle class="text-xl font-semibold">What's New</DialogTitle>
            <DialogDescription class="text-sm text-muted-foreground">
              See what's new in OrcaQ
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="flex-1 -mx-6 px-6 overflow-y-auto">
        <div class="space-y-8 py-4">
          <!-- Loading State -->
          <div v-if="isLoading" class="flex items-center justify-center py-12">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
            ></div>
          </div>

          <!-- Changelog Entries -->
          <template v-else>
            <div
              v-for="entry in changelogEntries"
              :key="entry.version"
              class="relative"
            >
              <!-- Version Badge -->
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="px-3 py-1 flex items-center gap-2 rounded-full bg-primary/10 text-primary font-mono text-sm font-medium"
                >
                  <Icon name="lucide:git-branch" class="size-5" />
                  v{{ entry.version }}
                </div>
                <span class="text-xs text-muted-foreground">{{
                  entry.date
                }}</span>
              </div>

              <!-- Markdown Content -->
              <div
                class="changelog-content prose prose-sm dark:prose-invert max-w-none"
                v-html="renderMarkdown(entry.content)"
              />

              <!-- Divider between versions -->
              <div
                v-if="
                  changelogEntries.indexOf(entry) < changelogEntries.length - 1
                "
                class="border-t border-border mt-6"
              />
            </div>

            <!-- Empty state -->
            <div
              v-if="changelogEntries.length === 0"
              class="text-center py-8 text-muted-foreground"
            >
              <Sparkles class="size-8 mx-auto mb-2 opacity-50" />
              <p>No updates available</p>
            </div>
          </template>
        </div>
      </div>

      <DialogFooter class="flex-shrink-0 pt-4 border-t">
        <Button @click="closeChangelog" class="w-full sm:w-auto">
          Got it, thanks!
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style>
@reference "~/assets/css/tailwind.css";

.changelog-content h1 {
  @apply mt-0 mb-4 text-2xl font-bold;
}

.changelog-content h2 {
  @apply mt-6 mb-3 text-xl font-semibold;
}

.changelog-content h3 {
  @apply mt-4 mb-2 text-lg font-semibold;
}

.changelog-content h4 {
  @apply mt-4 mb-2 text-base font-semibold;
}

.changelog-content h5 {
  @apply mt-3 mb-1 text-sm font-bold;
}

.changelog-content h6 {
  @apply mt-3 mb-1 text-xs font-bold tracking-wider uppercase;
}

.changelog-content a {
  @apply underline hover:text-blue-500;
}

.changelog-content ul {
  list-style-type: disc;
  padding-left: 1.25rem;
}

.changelog-content li::marker {
  color: var(--muted-foreground);
}
</style>
