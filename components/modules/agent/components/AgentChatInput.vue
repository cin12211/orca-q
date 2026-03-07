<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import type { AIProvider } from '~/core/stores/appLayoutStore';

const props = defineProps<{
  modelValue: string;
  isLoading: boolean;
  hasApiKey: boolean;
  provider: AIProvider;
  model: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:provider', value: AIProvider): void;
  (e: 'update:model', value: string): void;
  (e: 'submit', event?: Event): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

const localInput = ref(props.modelValue);
const showCommandPalette = ref(false);

watch(
  () => props.modelValue,
  val => {
    localInput.value = val;
  }
);

const textareaRef = ref<any>(null);

const focusInput = () => {
  if (!textareaRef.value) return;
  // If textareaRef is a component with an underlying element or focus method
  if (typeof textareaRef.value.focus === 'function') {
    textareaRef.value.focus();
  } else if (textareaRef.value.$el) {
    textareaRef.value.$el.focus();
  }
};

defineExpose({ focusInput });

const handleInput = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value;
  localInput.value = val;
  emit('update:modelValue', val);

  if (val.endsWith('/') || val === '/') {
    showCommandPalette.value = true;
  } else if (!val.includes('/')) {
    showCommandPalette.value = false;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  emit('keydown', event);
};

const handleSubmit = (event?: Event) => {
  event?.preventDefault();
  emit(
    'submit',
    typeof event === 'object' && event !== null ? event : undefined
  );
};

// Context Dropdown mock
const selectedContext = ref('Extra High');
const contexts = ['Low', 'Medium', 'High', 'Extra High'];

// Pass-through for provider/model
const internalProvider = computed({
  get: () => props.provider,
  set: val => emit('update:provider', val),
});
const internalModel = computed({
  get: () => props.model,
  set: val => emit('update:model', val),
});
</script>

<template>
  <div class="w-full relative">
    <!-- Command Palette (Conditional) -->
    <div
      v-if="showCommandPalette"
      class="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-background rounded-xl border border-border shadow-lg overflow-hidden z-50"
    >
      <div class="px-4 py-3 border-b border-border/50">
        <input
          type="text"
          placeholder="Search commands..."
          class="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          autofocus
        />
      </div>

      <div class="px-2 py-2 max-h-[300px] overflow-y-auto">
        <!-- Selected Item -->
        <div
          class="hover:bg-muted rounded-xl flex items-center px-3 py-2.5 cursor-pointer relative group"
        >
          <Icon
            name="lucide:bot"
            class="size-[18px] text-foreground mr-3 stroke-[1.5]"
          />
          <span class="text-foreground font-medium text-xs">Code review</span>
        </div>

        <div
          class="flex items-center px-3 py-2.5 cursor-pointer hover:bg-muted rounded-xl mt-0.5"
        >
          <Icon
            name="lucide:zap"
            class="size-[18px] text-muted-foreground mr-3 stroke-[1.5]"
          />
          <span class="text-foreground font-medium text-xs mr-2">Fast</span>
          <span class="text-muted-foreground truncate text-xs"
            >Turn on Fast mode and return to standard inference speed</span
          >
        </div>

        <div
          class="flex items-center px-3 py-2.5 cursor-pointer hover:bg-muted rounded-xl mt-0.5"
        >
          <Icon
            name="hugeicons:robotic"
            class="size-[18px] text-muted-foreground mr-3 stroke-[1.5]"
          />
          <span class="text-foreground font-medium text-xs">Feedback</span>
        </div>

        <div
          class="flex items-center px-3 py-2.5 cursor-pointer hover:bg-muted rounded-xl mt-0.5"
        >
          <Icon
            name="lucide:git-fork"
            class="size-[18px] text-muted-foreground mr-3 stroke-[1.5]"
          />
          <span class="text-foreground font-medium text-xs mr-2">Fork</span>
          <span class="text-muted-foreground truncate text-xs"
            >Fork this thread into local or a new worktree</span
          >
        </div>

        <div
          class="flex items-center px-3 py-2.5 cursor-pointer hover:bg-muted rounded-xl mt-0.5"
        >
          <Icon
            name="lucide:paperclip"
            class="size-[18px] text-muted-foreground mr-3 stroke-[1.5]"
          />
          <span class="text-foreground font-medium text-xs mr-2">MCP</span>
          <span class="text-muted-foreground text-xs"
            >Show MCP server status</span
          >
        </div>
      </div>
    </div>

    <!-- Chat Input Box -->
    <div
      class="bg-background rounded-[24px] border border-border/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-3 flex flex-col gap-1 relative z-40"
    >
      <Textarea
        ref="textareaRef"
        v-model="localInput"
        :disabled="!hasApiKey || isLoading"
        placeholder="Ask about schema design, query plans, reports, or safe mutations..."
        class="w-full bg-transparent outline-none border-0 shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground resize-none px-2 pt-0 min-h-10 max-h-36 text-[15px]"
        @input="handleInput"
        @keydown="handleKeyDown"
      />

      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="size-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                <Icon name="lucide:plus" class="size-[20px] stroke-[2]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add attachment</TooltipContent>
          </Tooltip>

          <!-- Model Dropdown inside the input -->
          <div class="relative w-[150px]">
            <ModelSelector
              v-model:provider="internalProvider"
              v-model:model="internalModel"
              class="h-8! border-0 bg-transparent hover:bg-muted/50 rounded-lg shadow-none px-2! text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
            />
          </div>

          <!-- Context Dropdown -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="flex items-center gap-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground px-2 py-1.5 rounded-lg transition-colors outline-none cursor-pointer"
              >
                <span class="text-xs">{{ selectedContext }}</span>
                <Icon name="lucide:chevron-down" class="size-3.5 stroke-[2]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-40 rounded-xl">
              <DropdownMenuItem
                v-for="ctx in contexts"
                :key="ctx"
                class="text-[13px] cursor-pointer flex justify-between items-center"
                @click="selectedContext = ctx"
              >
                <span :class="selectedContext === ctx ? 'font-medium' : ''">{{
                  ctx
                }}</span>
                <Icon
                  v-if="selectedContext === ctx"
                  name="lucide:check"
                  class="size-4"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div class="flex items-center gap-3">
          <Button
            type="button"
            class="rounded-full shadow size-8 p-0 bg-foreground text-background hover:bg-foreground disabled disabled:bg-muted disabled:text-muted-foreground"
            :disabled="!localInput.trim() || !hasApiKey || isLoading"
            @click="handleSubmit"
          >
            <Icon
              :name="isLoading ? 'lucide:loader' : 'lucide:arrow-up'"
              :class="[
                'size-[18px] stroke-[2]',
                isLoading ? 'animate-spin' : '',
              ]"
            />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
