import { ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  LocalStorageKey,
  LocalStorageManager,
} from '~/core/persist/LocalStorageManager';
import {
  GITHUB_STAR_FALLBACK_URL,
  GITHUB_STAR_SHOW_DELAY_MS,
} from '../constants';
import { GithubStarStatus } from '../types';
import {
  parseGithubStarStatus,
  parseLaunchCount,
  shouldShowGithubStarPrompt,
} from '../utils';

/**
 * Counts app launches and decides whether to ask the user to star the repo.
 * Call `registerLaunch` once per app start.
 */
export function useGithubStarPrompt() {
  const config = useRuntimeConfig();

  const isOpen = ref(false);
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  const currentVersion = String(config.public.version ?? '');
  const repoUrl = String(config.public.githubLink || GITHUB_STAR_FALLBACK_URL);

  const registerLaunch = () => {
    if (typeof window === 'undefined') return;

    const launchCount =
      parseLaunchCount(
        LocalStorageManager.get(LocalStorageKey.APP_LAUNCH_COUNT)
      ) + 1;
    LocalStorageManager.set(
      LocalStorageKey.APP_LAUNCH_COUNT,
      String(launchCount)
    );

    const shouldShow = shouldShowGithubStarPrompt({
      status: parseGithubStarStatus(
        LocalStorageManager.get(LocalStorageKey.GITHUB_STAR_STATUS)
      ),
      laterVersion: LocalStorageManager.get(
        LocalStorageKey.GITHUB_STAR_LATER_VERSION
      ),
      launchCount,
      currentVersion,
    });

    if (!shouldShow) return;

    showTimer = setTimeout(() => {
      isOpen.value = true;
    }, GITHUB_STAR_SHOW_DELAY_MS);
  };

  const saveStatus = (status: GithubStarStatus) => {
    LocalStorageManager.set(LocalStorageKey.GITHUB_STAR_STATUS, status);
    isOpen.value = false;
  };

  const onStar = () => {
    window.open(repoUrl, '_blank', 'noopener,noreferrer');
    saveStatus(GithubStarStatus.Starred);
    toast.success('Thanks for the star!', {
      description: 'It really helps OrcaQ grow.',
    });
  };

  const onLater = () => {
    LocalStorageManager.set(
      LocalStorageKey.GITHUB_STAR_LATER_VERSION,
      currentVersion
    );
    saveStatus(GithubStarStatus.Later);
  };

  const onDecline = () => {
    saveStatus(GithubStarStatus.Declined);
  };

  const dispose = () => {
    if (showTimer) clearTimeout(showTimer);
    showTimer = null;
  };

  return {
    isOpen,
    registerLaunch,
    onStar,
    onLater,
    onDecline,
    dispose,
  };
}
