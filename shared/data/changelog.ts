// Changelog configuration
// The actual changelog content is loaded from /changelogs/*.md files

export interface ChangelogEntry {
  version: string;
  date: string;
  content: string; // Markdown content
}

// Define changelog versions and their metadata
// The markdown content will be imported at build time
export const changelogMeta: Array<{ version: string; date: string }> = [
  // { version: '1.0.23', date: '2026-01-20' },
  { version: '1.0.22', date: '2026-01-15' },
  { version: '1.0.0', date: '2025-09-21' },
];

// Get the latest version
export const getLatestVersion = () => changelogMeta[0]?.version || '0.0.0';

// Get versions newer than the last seen version
export const getVersionsSince = (lastSeenVersion: string): string[] => {
  const lastSeenIndex = changelogMeta.findIndex(
    entry => entry.version === lastSeenVersion
  );

  // If version not found, return all versions
  if (lastSeenIndex === -1) return changelogMeta.map(e => e.version);

  // Return all versions newer than the last seen
  return changelogMeta.slice(0, lastSeenIndex).map(e => e.version);
};

// Compare versions (returns true if v1 > v2)
export const isNewerVersion = (v1: string, v2: string): boolean => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
};
