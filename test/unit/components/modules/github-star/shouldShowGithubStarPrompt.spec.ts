import { describe, expect, it } from 'vitest';
import { GithubStarStatus } from '~/components/modules/github-star/types';
import {
  parseGithubStarStatus,
  parseLaunchCount,
  shouldShowGithubStarPrompt,
} from '~/components/modules/github-star/utils';

const base = {
  status: null,
  laterVersion: null,
  launchCount: 3,
  currentVersion: '1.1.18',
};

describe('shouldShowGithubStarPrompt', () => {
  it('waits until the third launch when the user has not answered', () => {
    expect(shouldShowGithubStarPrompt({ ...base, launchCount: 1 })).toBe(false);
    expect(shouldShowGithubStarPrompt({ ...base, launchCount: 2 })).toBe(false);
    expect(shouldShowGithubStarPrompt({ ...base, launchCount: 3 })).toBe(true);
    expect(shouldShowGithubStarPrompt({ ...base, launchCount: 10 })).toBe(true);
  });

  it('never shows again after starring or declining', () => {
    for (const status of [
      GithubStarStatus.Starred,
      GithubStarStatus.Declined,
    ]) {
      expect(shouldShowGithubStarPrompt({ ...base, status })).toBe(false);
      expect(
        shouldShowGithubStarPrompt({
          ...base,
          status,
          laterVersion: '1.1.17',
        })
      ).toBe(false);
    }
  });

  it('after "Later", shows again only once the app version changes', () => {
    const later = { ...base, status: GithubStarStatus.Later, launchCount: 50 };

    expect(
      shouldShowGithubStarPrompt({ ...later, laterVersion: '1.1.18' })
    ).toBe(false);
    expect(
      shouldShowGithubStarPrompt({ ...later, laterVersion: '1.1.17' })
    ).toBe(true);
    expect(shouldShowGithubStarPrompt({ ...later, laterVersion: null })).toBe(
      false
    );
  });
});

describe('github star parsers', () => {
  it('parses stored status and ignores unknown values', () => {
    expect(parseGithubStarStatus('starred')).toBe(GithubStarStatus.Starred);
    expect(parseGithubStarStatus('later')).toBe(GithubStarStatus.Later);
    expect(parseGithubStarStatus('nope')).toBeNull();
    expect(parseGithubStarStatus(null)).toBeNull();
  });

  it('parses launch count defensively', () => {
    expect(parseLaunchCount('4')).toBe(4);
    expect(parseLaunchCount(null)).toBe(0);
    expect(parseLaunchCount('abc')).toBe(0);
    expect(parseLaunchCount('-2')).toBe(0);
  });
});
