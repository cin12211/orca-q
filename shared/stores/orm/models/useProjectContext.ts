import { useRepo } from 'pinia-orm';
import { uuidv4 } from '~/lib/utils';
import { Connection, Project, Schema, Workspace } from './models-v2';

export const useProjectContext = () => {
  const projectRepo = useRepo(Project);
  const workspaceRepo = useRepo(Workspace);
  const connectionRepo = useRepo(Connection);
  const schemaRepo = useRepo(Schema);

  /**
   * Ensure a single Project exists; if not, create one.
   */
  const ensureProject = () => {
    let proj = projectRepo.query().with('workspaces').first();
    if (!proj) {
      const now = new Date().toISOString();
      const id = uuidv4();
      projectRepo.create({
        data: { id, createdAt: now, selectedWorkspaceId: null },
      });
      proj = projectRepo.query().with('workspaces').first();
    }
    return proj!;
  };

  // Initialize on mount
  onMounted(() => {
    ensureProject();
  });

  // Since we only ever have one Project, grab the first
  const project = computed(() =>
    projectRepo.query().with('workspaces').first()
  );

  // List of all workspaces
  const workspaces = computed(() => project.value?.workspaces ?? []);

  // Currently selected workspace object
  const selectedWorkspace = computed(() => {
    const selId = project.value?.selectedWorkspaceId;
    return workspaces.value.find(ws => ws.id === selId) ?? null;
  });

  // Change selection in the Project
  const onChangeWorkspace = (workspaceId: string | null) => {
    if (!project.value) return;
    projectRepo.update({
      where: project.value.id,
      data: { selectedWorkspaceId: workspaceId },
    });
  };

  // Add a new workspace under this project
  const addWorkspace = (
    data: Omit<Partial<Workspace>, 'id' | 'projectId' | 'createdAt'>
  ) => {
    if (!project.value) return;
    const now = new Date().toISOString();
    const id = `ws_${Math.random().toString(36).substr(2, 9)}`;
    workspaceRepo.create({
      data: { id, projectId: project.value.id, createdAt: now, ...data },
    });
  };

  // Edit an existing workspace
  const editWorkspace = (id: string, updates: Partial<Workspace>) => {
    workspaceRepo.update({ where: id, data: updates });
  };

  // Delete a workspace and clear selection if needed
  const deleteWorkspace = (id: string) => {
    workspaceRepo.delete(id);
    if (project.value?.selectedWorkspaceId === id) {
      onChangeWorkspace(null);
    }
  };

  return {
    workspaces,
    selectedWorkspace,
    onChangeWorkspace,
    addWorkspace,
    editWorkspace,
    deleteWorkspace,
  };
};
