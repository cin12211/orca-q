export enum GithubStarStatus {
  Starred = 'starred',
  Declined = 'declined',
  Later = 'later',
}

export interface GithubStarPromptState {
  status: GithubStarStatus | null;
  laterVersion: string | null;
  launchCount: number;
  currentVersion: string;
}
