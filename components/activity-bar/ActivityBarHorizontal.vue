<script setup lang="ts">
import { useActivityMenu } from './activityMenu';

const { activity, onChangeActivity } = useActivityMenu();
</script>

<template>
  <div class="flex items-center gap-1">
    <Tooltip v-for="item in activity">
      <TooltipTrigger as-child>
        <Button
          size="iconMd"
          :variant="item.isActive ? 'default' : 'ghost'"
          @click="onChangeActivity(item.id)"
        >
          <Icon :name="item.icon" class="size-5!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{{ item.title }}</p>
      </TooltipContent>
    </Tooltip>
  </div>
</template>
