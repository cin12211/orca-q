import { computed, ref } from 'vue';

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'open';
  suggestions: string[];
  required: boolean;
}

type QuizAnswer = string | string[];

// Module-level singleton — shared across all consumers within this agent module
const questions = ref<QuizQuestion[]>([]);
const answers = ref<Record<string, QuizAnswer>>({});
const currentIndex = ref(0);
const isVisible = ref(false);
const context = ref('');

function openQuiz(newQuestions: QuizQuestion[], ctx: string) {
  questions.value = newQuestions;
  answers.value = {};
  currentIndex.value = 0;
  context.value = ctx;
  isVisible.value = true;
}

function closeQuiz() {
  isVisible.value = false;
  questions.value = [];
  answers.value = {};
  currentIndex.value = 0;
  context.value = '';
}

function next() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
  }
}

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
}

function goTo(index: number) {
  if (index >= 0 && index < questions.value.length) {
    currentIndex.value = index;
  }
}

function setAnswer(questionId: string, value: QuizAnswer) {
  answers.value = { ...answers.value, [questionId]: value };
}

function isAnswered(questionId: string): boolean {
  const answer = answers.value[questionId];
  if (Array.isArray(answer)) return answer.length > 0;
  return !!answer?.trim();
}

function formatAnswersForAgent(): string {
  const parts = questions.value
    .filter(q => isAnswered(q.id))
    .map(q => {
      const answer = answers.value[q.id];
      const formatted = Array.isArray(answer) ? answer.join(', ') : answer;
      return `${q.id}: ${formatted}`;
    });
  return `[Quiz answers] ${parts.join(' | ')}`;
}

const currentQuestion = computed(() => questions.value[currentIndex.value]);
const isOnLastQuestion = computed(
  () => currentIndex.value === questions.value.length - 1
);
const canSubmit = computed(() =>
  questions.value.every(q => !q.required || isAnswered(q.id))
);

export function useQuizState() {
  return {
    // State
    questions,
    answers,
    currentIndex,
    isVisible,
    context,
    // Computed
    currentQuestion,
    isOnLastQuestion,
    canSubmit,
    // Methods
    openQuiz,
    closeQuiz,
    next,
    prev,
    goTo,
    setAnswer,
    isAnswered,
    formatAnswersForAgent,
  };
}
