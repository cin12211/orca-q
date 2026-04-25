<script setup lang="ts">
import type { Component } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '~/lib/utils';

defineProps<{
  name: string;
  icon: Component;
  selected: boolean;
  isSupport: boolean;
  isBeta?: boolean;
  iconClass?: string;
  unsupportedLabel?: string;
}>();
</script>

<template>
  <Card
    :class="
      cn(
        'relative',
        isSupport ? 'cursor-pointer' : 'opacity-90 cursor-not-allowed ',
        selected && isSupport
          ? 'border-muted-foreground shadow-lg'
          : 'border-transparent bg-background'
      )
    "
  >
    <CardContent class="flex flex-col items-center justify-center p-0 w-full">
      <div
        :class="
          cn(
            'flex items-center justify-center rounded-xl p-2 transition-transform duration-300',
            selected && isSupport ? 'scale-105' : 'group-hover:scale-105',
            !isSupport && 'opacity-40'
          )
        "
      >
        <component :is="icon" :class="cn('size-12', iconClass)" />
      </div>

      <div class="flex flex-col items-center gap-1.5 text-center">
        <span
          :class="
            cn(
              'text-sm font-medium tracking-tight transition-colors',
              selected && isSupport ? 'text-primary' : 'text-foreground/70',
              !isSupport && 'text-muted-foreground'
            )
          "
        >
          {{ name }}
        </span>
        <div class="flex items-center justify-center gap-1.5 min-h-3.5">
          <Badge
            v-if="isBeta"
            variant="outline"
            class="text-[9px] px-1.5 py-0 h-3.5 uppercase tracking-widest font-bold border-amber-500/40 text-amber-600"
          >
            Beta
          </Badge>
          <Badge
            v-if="!isSupport"
            variant="secondary"
            class="text-[9px] px-1.5 py-0 h-3.5 uppercase tracking-widest font-bold opacity-60"
          >
            {{ unsupportedLabel || 'Soon' }}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
