<script setup lang="ts">
import {
  Button,
  CodeHighlightPreview,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
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
  <Tooltip>
    <Popover>
      <PopoverTrigger as-child>
        <TooltipTrigger as-child>
          <Button @click="onGetParser" size="xxs" variant="outline">
            SQL
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View SQL query</p>
        </TooltipContent>
      </PopoverTrigger>
      <PopoverContent class="w-[40rem] p-2 space-y-2" :restore-focus="true">
        <div class="text-xs font-medium">
          Curren filter
          <CodeHighlightPreview
            :code="appliedFilter"
            language="sql"
            max-height="15rem"
            class="mt-1"
          />
        </div>

        <div class="text-xs font-medium">
          Apply all filter
          <CodeHighlightPreview
            :code="allFilter"
            language="sql"
            max-height="15rem"
            class="mt-1"
          />
        </div>
      </PopoverContent>
    </Popover>
  </Tooltip>
</template>
