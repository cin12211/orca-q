// Composable for managing changelog modal state
import { ref } from 'vue';
import {
  changelogMeta,
  getLatestVersion,
  getVersionsSince,
  type ChangelogEntry,
} from '../data/changelogs/changelog';
import { getPlatformStorage } from '../persist/storage-adapter';

const LAST_SEEN_VERSION_KEY = 'orcaq-last-seen-version';

// Global state for changelog modal
const isChangelogOpen = ref(false);
const changelogEntries = ref<ChangelogEntry[]>([]);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const hasMore = ref(false);
const currentBatchIndex = ref(0);
const BATCH_SIZE = 5;

// Import all changelog markdown files
const changelogModules = import.meta.glob('../data/changelogs/*.md', {
  query: '?raw',
  import: 'default',
});

export function useChangelogModal() {
  // Get the last seen version from platform storage
  const getLastSeenVersion = (): string | null => {
    if (typeof window === 'undefined') return null;
    return getPlatformStorage().getItem(LAST_SEEN_VERSION_KEY);
  };

  // Save the current version as seen
  const markVersionAsSeen = () => {
    if (typeof window === 'undefined') return;
    const currentVersion = getLatestVersion();
    getPlatformStorage().setItem(LAST_SEEN_VERSION_KEY, currentVersion);
  };

  // Parse frontmatter from markdown content
  const parseFrontmatter = (
    content: string
  ): { meta: Record<string, string>; body: string } => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { meta: {}, body: content };
    }

    const meta: Record<string, string> = {};
    const frontmatter = match[1];
    const body = match[2];

    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        meta[key] = value;
      }
    });

    return { meta, body };
  };

  // Load changelog content for specific versions
  const loadChangelogContent = async (
    versions: string[]
  ): Promise<ChangelogEntry[]> => {
    const entries: ChangelogEntry[] = [];

    for (const version of versions) {
      const path = `../data/changelogs/${version}.md`;

      if (changelogModules[path]) {
        try {
          const rawContent = (await changelogModules[path]()) as string;
          const { meta, body } = parseFrontmatter(rawContent);

          const metaEntry = changelogMeta.find(m => m.version === version);

          entries.push({
            version: meta.version || version,
            date: meta.date || metaEntry?.date || '',
            content: body.trim(),
          });
        } catch (error) {
          console.error(
            `Failed to load changelog for version ${version}:`,
            error
          );
        }
      }
    }

    return entries;
  };

  // Check if there are new changes to show
  const checkForNewVersion = (): boolean => {
    const lastSeenVersion = getLastSeenVersion();
    const currentVersion = getLatestVersion();

    // First time user or new version available
    return !lastSeenVersion || lastSeenVersion !== currentVersion;
  };

  // Open the changelog modal (can be called manually)
  const openChangelog = async () => {
    isLoading.value = true;
    currentBatchIndex.value = 0;

    try {
      const lastSeenVersion = getLastSeenVersion();
      let versionsToShow = getVersionsSince(lastSeenVersion || '');

      // If no new entries, show the latest one at least
      if (versionsToShow.length === 0) {
        versionsToShow = [getLatestVersion()];
      }

      // If we're opening specifically to see "what's new", we might want to allow "view all"
      // So we'll fetch the first batch of versions from changelogMeta
      const allVersions = changelogMeta.map(e => e.version);
      const initialVersions = allVersions.slice(0, BATCH_SIZE);

      changelogEntries.value = await loadChangelogContent(initialVersions);
      hasMore.value = allVersions.length > BATCH_SIZE;
      currentBatchIndex.value = BATCH_SIZE;

      isChangelogOpen.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  // Load more entries
  const loadMore = async () => {
    if (isLoadingMore.value || !hasMore.value) return;

    isLoadingMore.value = true;
    try {
      const allVersions = changelogMeta.map(e => e.version);
      const nextVersions = allVersions.slice(
        currentBatchIndex.value,
        currentBatchIndex.value + BATCH_SIZE
      );

      const newEntries = await loadChangelogContent(nextVersions);
      changelogEntries.value = [...changelogEntries.value, ...newEntries];

      currentBatchIndex.value += BATCH_SIZE;
      hasMore.value = allVersions.length > currentBatchIndex.value;
    } finally {
      isLoadingMore.value = false;
    }
  };

  // Close the changelog modal and mark as seen
  const closeChangelog = () => {
    markVersionAsSeen();
    isChangelogOpen.value = false;
  };

  // Auto-show changelog if there's a new version
  const autoShowIfNewVersion = async () => {
    if (checkForNewVersion()) {
      await openChangelog();
    }
  };

  return {
    isChangelogOpen,
    changelogEntries,
    isLoading,
    isLoadingMore,
    hasMore,
    openChangelog,
    loadMore,
    closeChangelog,
    autoShowIfNewVersion,
    markVersionAsSeen,
    getLastSeenVersion,
  };
}
