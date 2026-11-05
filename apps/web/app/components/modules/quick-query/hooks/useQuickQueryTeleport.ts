export const useQuickQueryTeleport = () => {
  const isActiveTeleport = ref(true);

  onActivated(() => {
    isActiveTeleport.value = true;
  });

  onDeactivated(() => {
    isActiveTeleport.value = false;
  });

  return {
    isActiveTeleport,
  };
};
