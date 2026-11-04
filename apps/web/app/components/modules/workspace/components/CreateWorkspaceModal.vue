<script setup lang="ts">
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
import { type Workspace } from '~/core/stores';
import { WORKSPACE_ICONS } from '../constants';
import { useWorkspaceForm } from '../hooks/useWorkspaceForm';

const props = defineProps<{
  open: Boolean;
  workspace?: Workspace;
  workspaceSeq?: number;
}>();

const emit = defineEmits(['update:open']);

const handleClose = () => {
  emit('update:open', false);
};

const { onSubmit } = useWorkspaceForm({
  workspace: props.workspace,
  workspaceSeq: props.workspaceSeq,
  onClose: handleClose,
});
</script>

<template>
  <Dialog :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {{ workspace ? 'Update workspace' : 'New workspace' }}
        </DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="icon">
          <FormItem>
            <FormLabel>Icon</FormLabel>
            <FormControl>
              <Popover>
                <PopoverTrigger as-child>
                  <Avatar
                    id="tour-workspace-icon"
                    class="cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none"
                    tabindex="0"
                    role="button"
                    aria-label="Select workspace icon"
                  >
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
                id="tour-workspace-name"
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
                id="tour-workspace-desc"
                placeholder="Workspace description ..."
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter class="mt-4">
          <Button id="tour-workspace-create" type="submit">
            {{ workspace ? 'Update' : 'Create' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
