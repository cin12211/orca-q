import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActivityMenu } from '~/components/modules/app-shell/activity-bar/hooks/useActivityMenu';
import { ActivityBarItemType, useActivityBarStore } from '~/core/stores';

const { trackEventMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

mockNuxtImport('useAmplitude', () => () => ({
  initialize: vi.fn(),
  trackEvent: trackEventMock,
  reset: vi.fn(),
}));

describe('useActivityMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('includes the database tools activity item', () => {
    const { activity } = useActivityMenu();
    const databaseTools = activity.value.find(
      item => item.id === ActivityBarItemType.DatabaseTools
    );

    expect(databaseTools).toMatchObject({
      id: ActivityBarItemType.DatabaseTools,
      title: 'Database Tools',
    });
  });

  it('activates database tools and tracks the activity event', () => {
    const { onChangeActivity } = useActivityMenu();
    const activityStore = useActivityBarStore();

    onChangeActivity(ActivityBarItemType.DatabaseTools);

    expect(activityStore.activityActive).toBe(
      ActivityBarItemType.DatabaseTools
    );
    expect(trackEventMock).toHaveBeenCalledWith('activity_bar', {
      activity: ActivityBarItemType.DatabaseTools,
    });
  });
});
