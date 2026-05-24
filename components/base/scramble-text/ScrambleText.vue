<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  texts: string[];
  duration?: number;
  speed?: number;
  loop?: boolean;
  loopDelay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 800,
  speed: 55,
  loop: true,
  loopDelay: 600,
});

const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  '!@#$%^&*()_+-=[]{}|;:,.<>?/~' +
  'アイウエオカキクケコサシスセソタチツテトナニヌネノ' +
  '░▒▓█▌▐▄▀■□▪▫▲△▼▽◆◇○●◎' +
  '∞≈≠≤≥±÷×√∑πΩµ';

type CharState = {
  char: string;
  reveal: boolean;
  dir: number;
  v: number;
};

const display = ref<CharState[]>([]);

let frame = 0;
let startTime = 0;
let lastScramble = 0;

let currentIndex = 0;
let phase: 'scramble' | 'reveal' | 'wait' = 'scramble';
let revealStart = 0;

let targetChars: string[] = [];

function randomChar() {
  return chars[(Math.random() * chars.length) | 0];
}

function randomDir() {
  return Math.random() > 0.5 ? 1 : -1;
}

function initText() {
  const target = props.texts[currentIndex];

  targetChars = [...target];

  display.value = targetChars.map(() => ({
    char: '',
    reveal: false,
    dir: randomDir(),
    v: 0,
  }));
}

function animate(time: number) {
  const len = targetChars.length;
  const center = (len / 2) | 0;

  if (!startTime) startTime = time;

  const elapsed = time - startTime;

  if (phase === 'scramble') {
    if (time - lastScramble > props.speed) {
      for (let i = 0; i < len; i++) {
        if (!display.value[i].reveal) {
          display.value[i].char = randomChar();
          display.value[i].v++;
        }
      }

      lastScramble = time;
    }

    if (elapsed > props.duration) {
      phase = 'reveal';
      revealStart = time;
    }
  }

  if (phase === 'reveal') {
    const revealElapsed = time - revealStart;

    for (let i = 0; i < len; i++) {
      const delay = Math.abs(i - center) * 40;

      if (revealElapsed > delay && !display.value[i].reveal) {
        display.value[i].char = targetChars[i];
        display.value[i].reveal = true;
        display.value[i].v++;
      }
    }

    if (revealElapsed > center * 40 + 200) {
      phase = 'wait';
      startTime = time;
    }
  }

  if (phase === 'wait') {
    if (time - startTime > props.loopDelay) {
      currentIndex = (currentIndex + 1) % props.texts.length;

      initText();

      phase = 'scramble';
      startTime = time;
    }
  }

  frame = requestAnimationFrame(animate);
}

onMounted(() => {
  initText();
  frame = requestAnimationFrame(animate);
});

onUnmounted(() => {
  cancelAnimationFrame(frame);
});
</script>

<template>
  <span class="inline-flex select-none" v-bind="$attrs">
    <span
      v-for="(c, i) in display"
      :key="i"
      :motion-key="c.v"
      v-motion
      :initial="{
        opacity: 0,
        y: c.dir * 16,
        scale: 0.9,
      }"
      :animate="{
        opacity: 1,
        y: 0,
        scale: 1,
      }"
      :transition="{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }"
      class="inline-block will-change-transform transform-gpu"
    >
      {{ c.char }}
    </span>
  </span>
</template>
