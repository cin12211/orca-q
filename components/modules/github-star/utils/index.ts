import { GITHUB_STAR_MIN_LAUNCH_COUNT } from '../constants';
import { GithubStarStatus, type GithubStarPromptState } from '../types';

/**
 * Starred or declined: never again. Later: again once the app version moves
 * past the one the user deferred on. No answer yet: from the Nth launch.
 */
export function shouldShowGithubStarPrompt({
  status,
  laterVersion,
  launchCount,
  currentVersion,
}: GithubStarPromptState): boolean {
  if (
    status === GithubStarStatus.Starred ||
    status === GithubStarStatus.Declined
  ) {
    return false;
  }

  if (status === GithubStarStatus.Later) {
    return !!laterVersion && laterVersion !== currentVersion;
  }

  return launchCount >= GITHUB_STAR_MIN_LAUNCH_COUNT;
}

export function parseGithubStarStatus(
  value: string | null
): GithubStarStatus | null {
  return Object.values(GithubStarStatus).includes(value as GithubStarStatus)
    ? (value as GithubStarStatus)
    : null;
}

export function parseLaunchCount(value: string | null): number {
  const count = Number.parseInt(value ?? '', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}
