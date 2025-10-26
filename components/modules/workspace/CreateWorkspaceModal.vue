<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import dayjs from 'dayjs';
import { useForm } from 'vee-validate';
import { toast } from 'vue-sonner';
import * as z from 'zod';
import { AutoForm } from '@/components/ui/auto-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { uuidv4 } from '~/lib/utils';
import { useWorkspacesService } from '~/shared/services/useWorkspacesService';
import { type Workspace } from '~/shared/stores';
import CustomPickIconField from './CustomPickIconField.vue';

const props = defineProps<{
  open: Boolean;
  workspace?: Workspace;
}>();

const emit = defineEmits(['update:open']);

const defaultIcon = 'lucide:badge';
const defaultName = 'My workspace';

const { update: updateWorkspace, create: createWorkspace } =
  useWorkspacesService();

const schema = z.object({
  icon: z.string().optional(),
  name: z.string().nonempty('Workspace name is required.'),
  desc: z.string().optional(),
});

const form = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: props.workspace
    ? {
        icon: props.workspace?.icon,
        name: props.workspace?.name,
        desc: props.workspace?.desc,
      }
    : {
        icon: defaultIcon,
        name: defaultName,
        desc: '',
      },
  name: 'workspace-form',
});

function onSubmit(values: z.infer<typeof schema>) {
  const isUpdate = !!props.workspace;

  if (isUpdate) {
    updateWorkspace(props.workspace.id, {
      ...props.workspace,
      desc: values.desc,
      name: values.name,
      icon: values.icon || '',
    });

    toast('Workspace has been updated', {
      description: dayjs().toString(),
    });
  } else {
    createWorkspace({
      desc: values.desc,
      id: uuidv4(),
      name: values.name,
      icon: values.icon || '',
      createdAt: dayjs().toISOString(),
    });

    toast('Workspace has been created', {
      description: dayjs().toString(),
    });
  }

  emit('update:open', false);
}
</script>

<template>
  <Dialog :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {{ workspace ? 'Update workspace' : 'New workspace' }}
        </DialogTitle>
      </DialogHeader>

      <AutoForm
        class="w-full space-y-2"
        :schema="schema"
        :form="form"
        :field-config="{
          icon: {
            component: CustomPickIconField,
            label: 'Icon',
          },
          name: {
            component: 'string',
            inputProps: { placeholder: 'Workspace name' },
          },
          desc: {
            component: 'textarea',
            inputProps: { placeholder: 'Workspace description ...' },
          },
        }"
        @submit="onSubmit"
      >
        <DialogFooter class="mt-4">
          <Button type="submit">
            {{ workspace ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </AutoForm>
    </DialogContent>
  </Dialog>
</template>
