<script setup lang="ts">
import { resolveCommandResultHandler } from '~/components/modules/driver/shared/raw-query';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import { RawQueryShell } from '~/components/modules/raw-query/shell';
import { ExplainOptionsMenu } from '../components';
import { ExplainQuery as ExplainQueryContainer } from '../explain';
import { usePostgresExplain, usePostgresRawQueryDescriptor } from '../hooks';

withDefaults(
  defineProps<{
    isSupportVariable?: boolean;
  }>(),
  {
    isSupportVariable: true,
  }
);

const shellRef = ref<InstanceType<typeof RawQueryShell> | null>(null);

const descriptor = usePostgresRawQueryDescriptor();

const explain = usePostgresExplain({
  executeCurrentStatement: params =>
    shellRef.value?.executeCurrentStatement(params),
  getEditorView: () => shellRef.value?.getEditorView() ?? null,
});
</script>

<template>
  <RawQueryShell
    ref="shellRef"
    :descriptor="descriptor"
    :executor="sqlStreamingExecutor"
    :resolve-command-result-handler="resolveCommandResultHandler"
    :is-support-variable="isSupportVariable"
    :extra-keymap="explain.explainKeymap"
    :extra-context-menu-items="explain.explainContextMenuItems"
  >
    <template #footer-extra>
      <ExplainOptionsMenu
        :option-items="explain.optionItems.value"
        :serialize-mode="explain.serializeMode.value"
        @run="explain.runExplain"
        @toggle-option="explain.toggleOption"
        @update:serialize-mode="explain.setSerializeMode"
      />
    </template>

    <template #result-view="{ tab, view }">
      <ExplainQueryContainer
        v-if="view === ViewMode.EXPLAIN"
        :active-tab="tab"
      />
    </template>
  </RawQueryShell>
</template>
