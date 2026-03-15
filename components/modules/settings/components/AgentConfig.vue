<script setup lang="ts">
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import { DEFAULT_CHAT_UI_CONFIG } from '~/components/modules/settings/constants';
import { ThinkingStyle, AIProvider } from '~/components/modules/settings/types';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  CHAT_CODE_FONT_SIZES,
  CHAT_FONT_SIZES,
  THINKING_STYLE_OPTIONS,
} from '../constants';

const appConfigStore = useAppConfigStore();

// Toggle visibility for API keys
const visibleKeys = ref<Record<string, boolean>>({
  openai: false,
  google: false,
  anthropic: false,
  xai: false,
  openrouter: false,
});

const toggleKeyVisibility = (provider: string) => {
  visibleKeys.value[provider] = !visibleKeys.value[provider];
};
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-4">
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:chatting-01" class="size-5!" /> Chat UI
      </h4>

      <div class="flex flex-col space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm">Font size</p>
            <p class="text-xs text-muted-foreground">
              Adjust the base size used for the chat UI
            </p>
          </div>
          <Select
            :modelValue="appConfigStore.chatUiConfigs.fontSize"
            @update:modelValue="
              appConfigStore.chatUiConfigs.fontSize = $event as number
            "
          >
            <SelectTrigger size="sm" class="h-6! cursor-pointer">
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  class="cursor-pointer h-6!"
                  v-for="value in CHAT_FONT_SIZES"
                  :value="value"
                >
                  {{ value }} px
                  {{
                    value === DEFAULT_CHAT_UI_CONFIG.fontSize ? '(default)' : ''
                  }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm">Code font size</p>
            <p class="text-xs text-muted-foreground">
              Adjust the base size used for code across chats and diffs
            </p>
          </div>
          <Select
            :modelValue="appConfigStore.chatUiConfigs.codeFontSize"
            @update:modelValue="
              appConfigStore.chatUiConfigs.codeFontSize = $event as number
            "
          >
            <SelectTrigger size="sm" class="h-6! cursor-pointer">
              <SelectValue placeholder="Select code size" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  class="cursor-pointer h-6!"
                  v-for="value in CHAT_CODE_FONT_SIZES"
                  :value="value"
                >
                  {{ value }} px
                  {{
                    value === DEFAULT_CHAT_UI_CONFIG.codeFontSize
                      ? '(default)'
                      : ''
                  }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm">Thinking style</p>
            <p class="text-xs text-muted-foreground">
              Choose the animation style used in the chat thinking indicator
            </p>
          </div>
          <Select
            :modelValue="appConfigStore.chatUiConfigs.thinkingStyle"
            @update:modelValue="
              appConfigStore.chatUiConfigs.thinkingStyle =
                $event as ThinkingStyle
            "
          >
            <SelectTrigger size="sm" class="h-6! cursor-pointer">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  class="cursor-pointer h-6!"
                  v-for="option in THINKING_STYLE_OPTIONS"
                  :value="option.value"
                >
                  {{ option.label }}
                  {{
                    option.value === DEFAULT_CHAT_UI_CONFIG.thinkingStyle
                      ? '(default)'
                      : ''
                  }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

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
          v-model:provider="appConfigStore.agentSelectedProvider"
          v-model:model="appConfigStore.agentSelectedModel"
          class="h-8!"
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
              v-model="appConfigStore.agentApiKeyConfigs.openai"
              :type="visibleKeys.openai ? 'text' : 'password'"
              placeholder="sk-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 w-8 p-0"
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
              v-model="appConfigStore.agentApiKeyConfigs.google"
              :type="visibleKeys.google ? 'text' : 'password'"
              placeholder="AIza..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 w-8 p-0"
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
              v-model="appConfigStore.agentApiKeyConfigs.anthropic"
              :type="visibleKeys.anthropic ? 'text' : 'password'"
              placeholder="sk-ant-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 w-8 p-0"
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
        <!-- <div class="flex flex-col gap-1">
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
              v-model="appConfigStore.agentApiKeyConfigs.xai"
              :type="visibleKeys.xai ? 'text' : 'password'"
              placeholder="xai-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button variant="ghost" size="sm" class="absolute right-0 top-0 w-8 p-0" @click="toggleKeyVisibility('xai')">
              <Icon
                :name="visibleKeys.xai ? 'lucide:eye-off' : 'lucide:eye'"
                class="size-4"
              />
            </Button>
          </div>
        </div> -->

        <!-- OpenRouter -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <p class="text-sm flex items-center gap-1">
              <Icon name="lucide:route" />
              OpenRouter
            </p>
            <a
              href="https://openrouter.ai/settings/keys"
              target="_blank"
              class="text-xs text-primary hover:underline"
            >
              Get API key →
            </a>
          </div>
          <div class="relative">
            <Input
              v-model="appConfigStore.agentApiKeyConfigs.openrouter"
              :type="visibleKeys.openrouter ? 'text' : 'password'"
              placeholder="sk-or-..."
              class="h-8 pr-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 w-8 p-0"
              @click="toggleKeyVisibility('openrouter')"
            >
              <Icon
                :name="visibleKeys.openrouter ? 'lucide:eye-off' : 'lucide:eye'"
                class="size-4"
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
