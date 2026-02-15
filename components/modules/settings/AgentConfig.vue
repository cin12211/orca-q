<script setup lang="ts">
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';

const appLayoutStore = useAppLayoutStore();

// Toggle visibility for API keys
const visibleKeys = ref<Record<string, boolean>>({
  openai: false,
  google: false,
  anthropic: false,
  xai: false,
});

const toggleKeyVisibility = (provider: string) => {
  visibleKeys.value[provider] = !visibleKeys.value[provider];
};
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-4">
    <!-- Default Provider/Model Selection -->
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:chat-bot" class="size-5!" /> Default Settings
      </h4>

      <div class="px-1">
        <label class="text-xs text-muted-foreground block mb-2"
          >Default Model</label
        >
        <ModelSelector
          v-model:provider="appLayoutStore.agentSelectedProvider"
          v-model:model="appLayoutStore.agentSelectedModel"
        />
      </div>
    </div>

    <!-- API Keys Configuration -->
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="lucide:key" class="size-5!" /> API Keys
      </h4>
      <p class="text-xs text-muted-foreground mb-3 px-1">
        Configure API keys for each provider. Keys are stored locally and never
        sent to our servers.
      </p>

      <div class="flex flex-col space-y-3 px-1">
        <!-- OpenAI -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <p class="text-sm flex items-center gap-1">
              <Icon name="hugeicons:chat-gpt" />
              OpenAI
            </p>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              class="text-xs text-primary hover:underline"
            >
              Get API key →
            </a>
          </div>
          <div class="relative">
            <Input
              v-model="appLayoutStore.agentApiKeyConfigs.openai"
              :type="visibleKeys.openai ? 'text' : 'password'"
              placeholder="sk-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-8 w-8 p-0"
              @click="toggleKeyVisibility('openai')"
            >
              <Icon
                :name="visibleKeys.openai ? 'lucide:eye-off' : 'lucide:eye'"
                class="size-4"
              />
            </Button>
          </div>
        </div>

        <!-- Google -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <p class="text-sm flex items-center gap-1">
              <Icon name="hugeicons:google-gemini" />
              Google Gemini
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              class="text-xs text-primary hover:underline"
            >
              Get API key →
            </a>
          </div>
          <div class="relative">
            <Input
              v-model="appLayoutStore.agentApiKeyConfigs.google"
              :type="visibleKeys.google ? 'text' : 'password'"
              placeholder="AIza..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-8 w-8 p-0"
              @click="toggleKeyVisibility('google')"
            >
              <Icon
                :name="visibleKeys.google ? 'lucide:eye-off' : 'lucide:eye'"
                class="size-4"
              />
            </Button>
          </div>
        </div>

        <!-- Anthropic -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <p class="text-sm flex items-center gap-1">
              <Icon name="hugeicons:claude" />
              Anthropic Claude
            </p>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              class="text-xs text-primary hover:underline"
            >
              Get API key →
            </a>
          </div>
          <div class="relative">
            <Input
              v-model="appLayoutStore.agentApiKeyConfigs.anthropic"
              :type="visibleKeys.anthropic ? 'text' : 'password'"
              placeholder="sk-ant-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-8 w-8 p-0"
              @click="toggleKeyVisibility('anthropic')"
            >
              <Icon
                :name="visibleKeys.anthropic ? 'lucide:eye-off' : 'lucide:eye'"
                class="size-4"
              />
            </Button>
          </div>
        </div>

        <!-- xAI -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <p class="text-sm flex items-center gap-1">
              <Icon name="hugeicons:grok-02" />

              xAI Grok
            </p>
            <a
              href="https://console.x.ai"
              target="_blank"
              class="text-xs text-primary hover:underline"
            >
              Get API key →
            </a>
          </div>
          <div class="relative">
            <Input
              v-model="appLayoutStore.agentApiKeyConfigs.xai"
              :type="visibleKeys.xai ? 'text' : 'password'"
              placeholder="xai-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-8 w-8 p-0"
              @click="toggleKeyVisibility('xai')"
            >
              <Icon
                :name="visibleKeys.xai ? 'lucide:eye-off' : 'lucide:eye'"
                class="size-4"
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
