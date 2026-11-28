<script setup lang="ts">
import { GithubStarPrompt } from '../components';
import { useGithubStarPrompt } from '../hooks';

const { isOpen, registerLaunch, onStar, onLater, onDecline, dispose } =
  useGithubStarPrompt();

onMounted(() => {
  registerLaunch();
});

onBeforeUnmount(() => {
  dispose();
});
</script>

<template>
  <GithubStarPrompt
    :open="isOpen"
    @star="onStar"
    @later="onLater"
    @decline="onDecline"
  />
</template>
