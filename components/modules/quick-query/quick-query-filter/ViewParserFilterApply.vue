<script setup lang="ts">
import { format } from 'sql-formatter';

const props = defineProps<{
  getParserApplyFilter: () => string;
  getParserAllFilter: () => string;
}>();

const appliedFilter = ref('');
const allFilter = ref('');

const onGetParser = () => {
  appliedFilter.value = format(props.getParserApplyFilter(), {
    language: 'postgresql',
    keywordCase: 'upper',
  });

  allFilter.value = format(props.getParserAllFilter(), {
    language: 'postgresql',
    keywordCase: 'upper',
  });
};
</script>
<template>
  <Popover>
    <PopoverTrigger>
      <Button
        @click="onGetParser"
        size="sm"
        class="h-6 text-xs"
        variant="outline"
      >
        SQL
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[40rem] p-2 space-y-2">
      <div class="text-xs font-medium">
        Curren filter
        <Textarea
          class="text-xs! mt-1 h-full max-h-[15rem] font-normal"
          :model-value="appliedFilter"
          readonly
        />
      </div>

      <div class="text-xs font-medium">
        Apply all filter
        <Textarea
          class="text-xs! mt-1 h-full max-h-[15rem] font-normal"
          :model-value="allFilter"
          readonly
        />
      </div>
    </PopoverContent>
  </Popover>
</template>
