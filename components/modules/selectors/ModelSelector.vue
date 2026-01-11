<script setup lang="ts">
import { cn } from '@/lib/utils';
import type { AIProvider } from '~/shared/stores/appLayoutStore';
import { AI_PROVIDERS } from '~/utils/constants/agent';

const props = defineProps<{
  provider: AIProvider;
  model: string;
  class?: string;
}>();

const emit = defineEmits<{
  (e: 'update:provider', value: AIProvider): void;
  (e: 'update:model', value: string): void;
}>();

// Build flat list of all provider/model combinations for lookup
const allModels = computed(() => {
  const result: {
    value: string;
    label: string;
    provider: string;
    providerName: string;
  }[] = [];
  for (const provider of AI_PROVIDERS) {
    for (const model of provider.models) {
      result.push({
        value: `${provider.id}/${model.id}`,
        label: model.name,
        provider: provider.id,
        providerName: provider.name,
      });
    }
  }
  return result;
});

// Group models by provider for the selector
const groupedModels = computed(() => {
  const groups: Record<string, typeof allModels.value> = {};
  for (const model of allModels.value) {
    if (!groups[model.providerName]) {
      groups[model.providerName] = [];
    }
    groups[model.providerName].push(model);
  }
  return groups;
});

// Combined provider/model value for single selector
const selectedModelFull = computed({
  get: () => `${props.provider}/${props.model}`,
  set: (val: string) => {
    const [providerId, modelId] = val.split('/');
    if (providerId && modelId) {
      // Validate provider exists
      const providerExists = AI_PROVIDERS.some(p => p.id === providerId);
      if (providerExists) {
        // We emit separate events for provider and model
        // Note: The parent should handle updating both props
        if (props.provider !== providerId) {
          emit('update:provider', providerId as AIProvider);
        }
        if (props.model !== modelId) {
          emit('update:model', modelId);
        }
      }
    }
  },
});

// Get current model display name
const currentModelDisplay = computed(() => {
  const model = allModels.value.find(m => m.value === selectedModelFull.value);
  if (model) {
    return `${model.providerName} / ${model.label}`;
  }
  // Fallback if model not found (e.g. config changed or invalid)
  const provider = AI_PROVIDERS.find(p => p.id === props.provider);
  if (provider) {
    return `${provider.name} / ${props.model}`;
  }
  return 'Select model';
});
</script>

<template>
  <Select v-model="selectedModelFull">
    <SelectTrigger :class="cn('text-xs px-2 w-full', props.class)">
      <SelectValue :placeholder="currentModelDisplay" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup
        v-for="(models, providerName) in groupedModels"
        :key="providerName"
      >
        <SelectLabel
          class="text-xs font-semibold px-2 py-1.5 text-muted-foreground"
          >{{ providerName }}</SelectLabel
        >
        <SelectItem
          v-for="model in models"
          :key="model.value"
          :value="model.value"
          class="text-xs cursor-pointer"
        >
          {{ model.label }}
        </SelectItem>

        <SelectSeparator class="my-1" />
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
