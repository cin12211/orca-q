export const useDatabase = () => {
  const { $projectRepo } = useNuxtApp();
  return $projectRepo;
};
