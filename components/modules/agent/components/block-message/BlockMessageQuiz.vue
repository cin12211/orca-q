<script setup lang="ts">
import { computed, ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { QuizQuestion } from '../../types';

const props = defineProps<{
  toolCallId: string;
  context: string;
  questions: QuizQuestion[];
}>();

const emit = defineEmits<{
  submit: [text: string];
}>();

type QuizAnswer = string | string[];

const answers = ref<Record<string, QuizAnswer>>({});
const currentIndex = ref(0);
const submitted = ref(false);

const currentQuestion = computed(() => props.questions[currentIndex.value]);
const isOnLastQuestion = computed(
  () => currentIndex.value === props.questions.length - 1
);
const canSubmit = computed(() =>
  props.questions.every(q => !q.required || isAnswered(q.id))
);

// Local text input value synced with current question's text answer
const textInput = ref('');

function syncText() {
  if (!currentQuestion.value) return;
  const answer = answers.value[currentQuestion.value.id];
  textInput.value = typeof answer === 'string' ? answer : '';
}

function isAnswered(questionId: string): boolean {
  const answer = answers.value[questionId];
  if (Array.isArray(answer)) return answer.length > 0;
  return !!answer?.trim();
}

function isChipSelected(value: string): boolean {
  const q = currentQuestion.value;
  if (!q) return false;
  const answer = answers.value[q.id];
  if (q.type === 'multiple')
    return Array.isArray(answer) && answer.includes(value);
  return answer === value;
}

function toggleChip(value: string) {
  const q = currentQuestion.value;
  if (!q) return;
  if (q.type === 'single') {
    answers.value = { ...answers.value, [q.id]: value };
    textInput.value = '';
  } else if (q.type === 'multiple') {
    const current = (answers.value[q.id] as string[] | undefined) ?? [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    answers.value = { ...answers.value, [q.id]: updated };
  }
}

function onTextInput(event: Event) {
  const q = currentQuestion.value;
  if (!q) return;
  const value = (event.target as HTMLInputElement).value;
  textInput.value = value;
  answers.value = { ...answers.value, [q.id]: value };
}

function goTo(index: number) {
  if (index >= 0 && index < props.questions.length) {
    currentIndex.value = index;
    syncText();
  }
}

function handlePrev() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    syncText();
  }
}

function handleNext() {
  if (isOnLastQuestion.value) {
    handleSubmit();
  } else {
    currentIndex.value++;
    syncText();
  }
}

function handleSkip() {
  if (isOnLastQuestion.value) {
    handleSubmit();
  } else {
    currentIndex.value++;
    syncText();
  }
}

function formatAnswers(): string {
  const parts = props.questions
    .filter(q => isAnswered(q.id))
    .map(q => {
      const answer = answers.value[q.id];
      const formatted = Array.isArray(answer) ? answer.join(', ') : answer;
      return `${q.id}: ${formatted}`;
    });
  return `[Quiz answers] ${parts.join(' | ')}`;
}

function handleSubmit() {
  if (!canSubmit.value) return;
  submitted.value = true;
  emit('submit', formatAnswers());
}

const answeredSummary = computed(() =>
  props.questions
    .filter(q => isAnswered(q.id))
    .map(q => {
      const answer = answers.value[q.id];
      return Array.isArray(answer) ? answer.join(', ') : answer;
    })
    .join(' · ')
);
</script>

<template>
  <!-- Submitted state: compact summary -->
  <div
    v-if="submitted"
    class="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
  >
    <Icon name="lucide:check-circle-2" class="size-3.5 shrink-0 text-primary" />
    <span class="text-xs text-muted-foreground truncate">
      <span class="font-medium text-foreground">Answered</span>
      <template v-if="answeredSummary"> · {{ answeredSummary }}</template>
    </span>
  </div>

  <!-- Active quiz card -->
  <div
    v-else-if="questions.length > 0"
    class="rounded-2xl border border-border/70 bg-background/80 overflow-hidden"
  >
    <!-- Card header -->
    <div class="px-4 pt-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <Badge variant="outline" class="text-xs px-1">
            <Icon name="lucide:help-circle" class="size-3 text-primary" />
            Clarification
          </Badge>

          <span
            v-if="context"
            class="text-xs text-muted-foreground truncate"
            :title="context"
          >
            {{ context }}
          </span>
        </div>
        <span class="shrink-0 text-[11px] text-muted-foreground">
          {{ currentIndex + 1 }} / {{ questions.length }}
        </span>
      </div>

      <!-- Progress bar -->
      <div class="h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full bg-primary transition-all duration-300"
          :style="{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }"
        />
      </div>
    </div>

    <!-- Question body -->
    <div class="px-4 py-3">
      <Transition name="quiz-slide" mode="out-in">
        <div v-if="currentQuestion" :key="currentQuestion.id" class="space-y-3">
          <!-- Question text -->
          <p class="text-sm leading-relaxed">
            {{ currentQuestion.question }}
            <span
              v-if="currentQuestion.required"
              class="text-destructive ml-0.5"
              aria-label="required"
              >*</span
            >
          </p>

          <!-- Suggestion items -->
          <template v-if="currentQuestion.suggestions?.length">
            <!-- Single choice -->
            <RadioGroup
              v-if="currentQuestion.type === 'single'"
              :model-value="answers[currentQuestion.id] as string"
              @update:model-value="(v: any) => toggleChip(String(v))"
              class="flex flex-col gap-3 py-1"
            >
              <div
                v-for="chip in currentQuestion.suggestions"
                :key="chip"
                class="flex items-center space-x-2"
              >
                <RadioGroupItem :id="chip" :value="chip" />
                <Label
                  :for="chip"
                  class="cursor-pointer text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >{{ chip }}</Label
                >
              </div>
            </RadioGroup>

            <!-- Multiple choice -->
            <div
              v-else-if="currentQuestion.type === 'multiple'"
              class="flex flex-col gap-3 py-1"
            >
              <div
                v-for="chip in currentQuestion.suggestions"
                :key="chip"
                class="flex items-center space-x-2"
              >
                <Checkbox
                  :id="chip"
                  :checked="isChipSelected(chip)"
                  @update:checked="toggleChip(chip)"
                />
                <Label
                  :for="chip"
                  class="cursor-pointer text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >{{ chip }}</Label
                >
              </div>
            </div>

            <!-- Default to RadioGroup if type is missing/unknown but suggestions exist -->
            <RadioGroup
              v-else
              :model-value="answers[currentQuestion.id] as string"
              @update:model-value="(v: any) => toggleChip(String(v))"
              class="flex flex-col gap-3 py-1"
            >
              <div
                v-for="chip in currentQuestion.suggestions"
                :key="chip"
                class="flex items-center space-x-2"
              >
                <RadioGroupItem :id="chip" :value="chip" />
                <Label
                  :for="chip"
                  class="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >{{ chip }}</Label
                >
              </div>
            </RadioGroup>
          </template>

          <!-- Text input -->
          <input
            :value="textInput"
            type="text"
            class="w-full rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
            :placeholder="
              currentQuestion.type === 'open'
                ? 'Type your answer…'
                : 'Or type a custom answer…'
            "
            @input="onTextInput"
          />
        </div>
      </Transition>
    </div>

    <!-- Footer navigation -->
    <div class="px-4 pb-4 flex items-center justify-between gap-2">
      <Button
        v-if="currentIndex > 0"
        variant="ghost"
        size="sm"
        class="text-xs h-7"
        @click="handlePrev"
      >
        <Icon name="lucide:arrow-left" class="size-3 mr-1" />
        Back
      </Button>
      <div v-else />

      <div class="flex items-center gap-1.5">
        <Button
          v-if="!currentQuestion?.required && !isOnLastQuestion"
          variant="ghost"
          size="xs"
          @click="handleSkip"
        >
          Skip
        </Button>
        <Button
          size="xs"
          :disabled="isOnLastQuestion && !canSubmit"
          @click="handleNext"
        >
          {{ isOnLastQuestion ? 'Submit' : 'Next' }}
          <Icon
            v-if="!isOnLastQuestion"
            name="lucide:arrow-right"
            class="size-3 ml-1"
          />
          <Icon v-else name="lucide:send" class="size-3 ml-1" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-slide-enter-active,
.quiz-slide-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.quiz-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.quiz-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
