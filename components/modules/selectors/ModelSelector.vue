<script setup lang="ts">
import { cn } from '@/lib/utils';
import { AI_PROVIDERS } from '~/core/constants/agent';
import type { AIProvider } from '~/core/stores/appLayoutStore';

const props = defineProps<{
  provider: AIProvider;
  model: string;
  class?: string;
}>();

const emit = defineEmits<{
  (e: 'update:provider', value: AIProvider): void;
  (e: 'update:model', value: string): void;
}>();

const DELIMITER = '::';

type ModelItem = {
  value: string;
  label: string;
  provider: AIProvider;
  providerName: string;
  modelId: string;
};

/**
 * build model list
 */
const { groupedModels, modelMap } = (() => {
  const groups: Record<string, ModelItem[]> = {};
  const map = new Map<string, ModelItem>();

  for (const provider of AI_PROVIDERS) {
    const list: ModelItem[] = [];

    for (const model of provider.models) {
      const value = `${provider.id}${DELIMITER}${model.id}`;

      const item: ModelItem = {
        value,
        label: model.name,
        provider: provider.id as AIProvider,
        providerName: provider.name,
        modelId: model.id,
      };

      list.push(item);
      map.set(value, item);
    }

    groups[provider.id] = list;
  }

  return {
    groupedModels: groups,
    modelMap: map,
  };
})();

/**
 * v-model bridge
 */
const selectedModelFull = computed({
  get: () => `${props.provider}${DELIMITER}${props.model}`,

  set: (val: string) => {
    const [providerId, modelId] = val.split(DELIMITER);

    if (!providerId || !modelId) return;

    if (props.provider !== providerId) {
      emit('update:provider', providerId as AIProvider);
    }

    if (props.model !== modelId) {
      emit('update:model', modelId);
    }
  },
});

/**
 * display label
 */
const currentModelDisplay = computed(() => {
  const model = modelMap.get(selectedModelFull.value);

  if (model) {
    return `${model.providerName} / ${model.label}`;
  }

  const provider = AI_PROVIDERS.find(p => p.id === props.provider);

  return provider ? `${provider.name} / ${props.model}` : 'Select model';
});
</script>

<template>
  <Select v-model="selectedModelFull">
    <SelectTrigger :class="cn('text-xs px-2 w-full', props.class)">
      <SelectValue :placeholder="currentModelDisplay" />
    </SelectTrigger>

    <SelectContent>
      <template v-for="provider in AI_PROVIDERS" :key="provider.id">
        <SelectGroup>
          <SelectLabel
            class="text-xs font-semibold px-2 py-1.5 text-muted-foreground"
          >
            {{ provider.name }}
          </SelectLabel>

          <SelectItem
            v-for="model in groupedModels[provider.id]"
            :key="model.value"
            :value="model.value"
            class="text-xs cursor-pointer"
          >
            {{ model.label }}
          </SelectItem>
        </SelectGroup>

        <SelectSeparator class="my-1" />
      </template>
    </SelectContent>
  </Select>
</template>
