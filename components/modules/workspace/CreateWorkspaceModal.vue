<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import dayjs from 'dayjs';
import { useForm } from 'vee-validate';
import { toast } from 'vue-sonner';
import * as z from 'zod';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_WORKSPACE_ICON,
  WORKSPACE_ICONS,
} from '~/core/constants/workspace-icon-constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { uuidv4 } from '~/core/helpers';
import { type Workspace } from '~/core/stores';

const props = defineProps<{
  open: Boolean;
  workspace?: Workspace;
  workspaceSeq?: number;
}>();

const emit = defineEmits(['update:open']);

const { workspaceStore } = useAppContext();

const schema = z.object({
  name: z.string({
    message: 'Workspace name is required.',
  }),
  desc: z.string().optional(),
  icon: z.string().default(DEFAULT_WORKSPACE_ICON),
});

const form = useForm({
  validationSchema: toTypedSchema(schema),
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
      ...props.workspace,
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

  emit('update:open', false);
});
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

      <form class="space-y-4" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="icon">
          <FormItem>
            <FormLabel>Icon</FormLabel>
            <FormControl>
              <Popover>
                <PopoverTrigger as-child>
                  <Avatar class="cursor-pointer">
                    <AvatarFallback>
                      <Icon
                        :name="
                          componentField.modelValue || 'hugeicons:folder-01'
                        "
                        class="size-5!"
                      />
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
                <PopoverContent class="w-full p-4">
                  <div class="grid grid-cols-8 gap-2">
                    <Avatar
                      v-for="icon in WORKSPACE_ICONS"
                      @click="componentField.onChange(icon)"
                      :key="icon"
                      class="cursor-pointer"
                    >
                      <AvatarFallback>
                        <Icon :name="icon" class="size-5!" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </PopoverContent>
              </Popover>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel class="gap-1"
              >Name <span class="text-red-500">*</span></FormLabel
            >
            <FormControl>
              <Input
                type="text"
                placeholder="Workspace name"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="desc">
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Workspace description ..."
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter class="mt-4">
          <Button type="submit">
            {{ workspace ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
