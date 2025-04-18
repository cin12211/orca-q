import { defineNuxtPlugin } from '#app';
import { ConnectionDB, Project } from '../shared/stores/orm/models';

export default defineNuxtPlugin(() => {
  const projectRepo = useRepo(Project);
  const connectionDBRepo = useRepo(ConnectionDB);

  // Inject vào context Nuxt
  return {
    provide: {
      projectRepo,
      connectionDBRepo,
    },
  };
});
