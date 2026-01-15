// Composable for managing changelog modal state
import { ref } from 'vue';
import {
  changelogMeta,
  getLatestVersion,
  getVersionsSince,
  type ChangelogEntry,
} from '../data/changelog';

const LAST_SEEN_VERSION_KEY = 'orcaq-last-seen-version';

// Global state for changelog modal
const isChangelogOpen = ref(false);
const changelogEntries = ref<ChangelogEntry[]>([]);
const isLoading = ref(false);

// Import all changelog markdown files
const changelogModules = import.meta.glob('/changelogs/*.md', {
  query: '?raw',
  import: 'default',
});

export function useChangelogModal() {
  // Get the last seen version from localStorage
  const getLastSeenVersion = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_SEEN_VERSION_KEY);
  };

  // Save the current version as seen
  const markVersionAsSeen = () => {
    if (typeof window === 'undefined') return;
    const currentVersion = getLatestVersion();
    localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
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
      const path = `/changelogs/${version}.md`;

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

    try {
      const lastSeenVersion = getLastSeenVersion();
      let versionsToShow = getVersionsSince(lastSeenVersion || '');

      // If no new entries, show the latest one at least
      if (versionsToShow.length === 0) {
        versionsToShow = [getLatestVersion()];
      }

      changelogEntries.value = await loadChangelogContent(versionsToShow);
      isChangelogOpen.value = true;
    } finally {
      isLoading.value = false;
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
    openChangelog,
    closeChangelog,
    autoShowIfNewVersion,
    markVersionAsSeen,
    getLastSeenVersion,
  };
}
