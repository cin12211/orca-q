<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
} from '#components';
import { Sparkles } from 'lucide-vue-next';
import BlockMessageMarkdown from '~/components/modules/agent/components/block-message/BlockMessageMarkdown.vue';
import { useChangelogModal } from '~/core/contexts/useChangelogModal';

const {
  isChangelogOpen,
  changelogEntries,
  isLoading,
  isLoadingMore,
  hasMore,
  closeChangelog,
  loadMore,
} = useChangelogModal();
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

      <div class="flex-1 -mx-6 px-6 py-4 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          ></div>
        </div>

        <!-- Changelog Entries -->
        <template v-else>
          <div
            v-for="(entry, index) in changelogEntries"
            :key="entry.version"
            class="relative pl-10 pb-8 last:pb-0 group"
          >
            <!-- Timeline line -->
            <div
              v-if="index !== changelogEntries.length - 1"
              class="absolute left-[9.5px] top-[14px] bottom-0 w-px bg-border/60 group-hover:bg-primary/30 transition-colors duration-300"
            />

            <!-- Timeline Node -->
            <div
              class="absolute left-0.5 top-[4.5px] size-4 rounded-full border-2 bg-background flex items-center justify-center z-10 transition-all duration-300"
              :class="[
                index === 0
                  ? 'border-primary shadow-[0_0_12px_-2px_theme(colors.primary/30%)] scale-110'
                  : 'border-muted-foreground/10 group-hover:border-primary/30 group-hover:scale-110',
              ]"
            >
              <div
                class="w-2 h-2 rounded-full transition-all duration-300"
                :class="[
                  index === 0
                    ? 'bg-primary shadow-[0_0_8px_theme(colors.primary/50%)]'
                    : 'bg-muted-foreground/10 group-hover:bg-primary/30',
                ]"
              />
            </div>

            <!-- Content wrapper -->
            <div class="relative min-h-[40px]">
              <!-- Version Badge -->
              <div class="flex items-center gap-2 mb-4">
                <Badge variant="outline">
                  <Icon name="hugeicons:git-branch" class="size-4" />
                  <span class="font-mono text-xs font-semibold"
                    >v{{ entry.version }}</span
                  >
                </Badge>

                <span class="text-xs text-muted-foreground/40">{{
                  entry.date
                }}</span>
              </div>

              <!-- Markdown Content -->
              <div class="prose-sm max-w-none">
                <BlockMessageMarkdown
                  :content="entry.content"
                  :is-streaming="false"
                />
              </div>
            </div>
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="relative flex justify-center pb-2 mt-0">
            <!-- Timeline line continuation -->

            <Button
              variant="outline"
              size="sm"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              <div v-if="isLoadingMore" class="flex items-center gap-2">
                <div
                  class="size-3 animate-spin rounded-full border-b-2 border-primary"
                />
                <span>Loading updates...</span>
              </div>
              <div v-else class="flex items-center gap-2">
                <Icon
                  name="hugeicons:arrow-down-01"
                  class="size-3 group-hover/btn:translate-y-0.5 transition-transform"
                />
                <span>View older updates</span>
              </div>
            </Button>
          </div>

          <!-- Empty state -->
          <BaseEmpty
            v-if="changelogEntries.length === 0"
            title="No updates available"
            desc="You're all up to date!"
            class="py-12"
          />
        </template>
      </div>

      <DialogFooter class="flex-shrink-0">
        <Button @click="closeChangelog" class="w-full sm:w-auto group">
          <Icon
            name="hugeicons:thumbs-up"
            class="size-4 group-hover:scale-110 transition-transform"
          />
          Got it, thanks!
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
