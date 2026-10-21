import { getConnectionCapabilityProfile } from '~/core/constants/connection-capabilities';
import { useManagementConnectionStore } from '~/core/stores';

/** Capability profile and visible activities for the selected connection. */
export const useVisibleActivityItems = () => {
  const managementConnectionStore = useManagementConnectionStore();

  const capabilityProfile = computed(() =>
    getConnectionCapabilityProfile(managementConnectionStore.selectedConnection)
  );

  const visibleActivityItems = computed(
    () => capabilityProfile.value.visibleActivityItems
  );

  return {
    capabilityProfile,
    visibleActivityItems,
  };
};
