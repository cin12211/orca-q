import { toTypedSchema } from '@vee-validate/zod';
import dayjs from 'dayjs';
import { useForm } from 'vee-validate';
import { toast } from 'vue-sonner';
import { uuidv4 } from '~/core/helpers';
import type { Workspace } from '~/core/stores';
import { useWorkspacesStore } from '~/core/stores';
import { DEFAULT_WORKSPACE_ICON } from '../constants';
import { workspaceSchema } from '../schemas/workspace.schema';

export function useWorkspaceForm(props: {
  workspace?: Workspace;
  workspaceSeq?: number;
  onClose: () => void;
}) {
  const workspaceStore = useWorkspacesStore();

  const form = useForm({
    validationSchema: toTypedSchema(workspaceSchema),
    initialValues: props.workspace
      ? {
          name: props.workspace.name,
          desc: props.workspace.desc,
          icon: props.workspace.icon || DEFAULT_WORKSPACE_ICON,
        }
      : {
          name: `My workspace ${props?.workspaceSeq || 0}`,
          icon: DEFAULT_WORKSPACE_ICON,
        },
    name: 'workspace-form',
  });

  const onSubmit = form.handleSubmit(values => {
    const isUpdate = !!props.workspace;

    if (isUpdate) {
      workspaceStore.updateWorkspace({
        ...props.workspace!,
        desc: values?.desc || undefined,
        name: values.name,
        icon: values.icon,
      });

      toast('Workspace has been updated', {
        description: dayjs().toString(),
      });
    } else {
      workspaceStore.createWorkspace({
        desc: values?.desc || undefined,
        id: uuidv4(),
        name: values.name,
        icon: values.icon,
        createdAt: dayjs().toISOString(),
      });

      toast('Workspace has been created', {
        description: dayjs().toString(),
      });
    }

    props.onClose();
  });

  return {
    form,
    onSubmit,
  };
}
