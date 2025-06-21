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
import { useAppContext } from '~/shared/contexts/useAppContext';
import { type Workspace } from '~/shared/stores';

const props = defineProps<{
  open: Boolean;
  workspace?: Workspace;
}>();

const emit = defineEmits(['update:open']);

const { workspaceStore } = useAppContext();

const schema = z.object({
  name: z.string().nonempty('Workspace name is required.'),

  desc: z.string().optional(),
});

const form = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: props.workspace && {
    name: props.workspace.name,
    desc: props.workspace.desc,
  },
  name: 'workspace-form',
});

function onSubmit(values: z.infer<typeof schema>) {
  const isUpdate = !!props.workspace;

  if (isUpdate) {
    workspaceStore.updateWorkspace({
      ...props.workspace,
      desc: values.desc,
      name: values.name,
    });

    toast('Workspace has been updated', {
      description: dayjs().toString(),
    });
  } else {
    workspaceStore.createWorkspace({
      desc: values.desc,
      id: uuidv4(),
      name: values.name,
      icon: 'lucide:badge',
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
        <!-- <DialogDescription>
          Make changes to your profile here. Click save when you're done.
        </DialogDescription> -->
      </DialogHeader>

      <AutoForm
        class="w-full space-y-2"
        :schema="schema"
        :form="form"
        :field-config="{
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
