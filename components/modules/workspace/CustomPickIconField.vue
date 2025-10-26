<script setup lang="ts">
import {
  AutoFormLabel,
  FormDescription,
  FormField,
  FormItem,
} from '#components';
import type { FieldProps } from '~/components/ui/auto-form';
import { FormControl } from '~/components/ui/form';

defineProps<FieldProps>();

const workspaceIcons = [
  'lucide:target',
  'lucide:badge',
  // 💾 Technical / Database
  'lucide:database',
  'lucide:server',
  'lucide:hard-drive',
  'lucide:layers',
  'lucide:grid',
  'lucide:table',
  'lucide:network',
  'lucide:folder-tree',
  'lucide:file-code',
  'lucide:file-cog',

  // 🧠 Dev & Logic
  'lucide:terminal',
  'lucide:code',
  'lucide:braces',
  'lucide:function-square',
  'lucide:binary',
  'lucide:workflow',
  'lucide:cpu',
  'lucide:package',
  'lucide:cog',
  'lucide:git-branch',

  // ☁️ Connection / Security
  'lucide:cloud',
  'lucide:globe',
  'lucide:link',
  'lucide:plug',
  'lucide:satellite',
  'lucide:wifi',
  'lucide:shield',
  'lucide:lock',
  'lucide:key',
  'lucide:share-2',

  // 😄 Fun / Personal / Creative
  'lucide:rocket', // khởi đầu, bứt phá
  'lucide:lightbulb', // ý tưởng
  'lucide:coffee', // dân code ai cũng cần 😆
  'lucide:beer', // vui vẻ, relax
  'lucide:flame', // nhiệt huyết
  'lucide:star', // nổi bật
  'lucide:sparkles', // lung linh ✨
  'lucide:heart', // yêu workspace của mình ❤️
  'lucide:smile', // thân thiện, chill
  'lucide:ghost', // vui nhộn, hacker vibe 👻
];
</script>
<template>
  <FormField v-slot="slotProps" :name="fieldName">
    <FormItem v-bind="$attrs">
      <AutoFormLabel v-if="!config?.hideLabel" :required="required">
        {{ config?.label }}
      </AutoFormLabel>

      <FormControl>
        <Popover>
          <PopoverTrigger as-child>
            <Avatar class="cursor-pointer">
              <AvatarFallback>
                <Icon
                  v-if="slotProps.field.value"
                  :name="slotProps.field.value"
                  class="size-5!"
                />
                <Icon v-else name="lucide:image" class="size-5 opacity-50" />
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>

          <PopoverContent class="w-[20rem]">
            <div class="flex items-center flex-wrap gap-4 justify-center">
              <Avatar
                v-for="icon in workspaceIcons"
                :key="icon"
                class="cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-primary"
                :class="[
                  slotProps.field.value === icon
                    ? 'ring-2 ring-primary'
                    : 'ring-0',
                ]"
                @click="slotProps.field.onChange(icon)"
              >
                <AvatarFallback>
                  <Icon :name="icon" class="size-5" />
                </AvatarFallback>
              </Avatar>
            </div>
          </PopoverContent>
        </Popover>
      </FormControl>

      <FormDescription v-if="config?.description">
        {{ config.description }}
      </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
