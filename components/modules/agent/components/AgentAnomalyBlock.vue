<script setup lang="ts">
import type {
  AgentAnomalyIssue,
  AgentAnomalySeverity,
  AgentDetectAnomalyResult,
} from '../db-agent.types';

defineProps<{
  data: AgentDetectAnomalyResult;
}>();

const severityVariantMap: Record<
  AgentAnomalySeverity,
  'destructive' | 'secondary' | 'outline'
> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

const getSeverityVariant = (severity: AgentAnomalyIssue['severity']) =>
  severityVariantMap[severity];
</script>

<template>
  <div class="space-y-4 rounded-[1.35rem] border border-border/70 bg-muted/20 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" class="text-[10px] tracking-[0.16em]">
        Clean Score {{ data.cleanScore }}/100
      </Badge>
      <Badge variant="outline" class="text-[10px] tracking-[0.16em]">
        {{ data.scannedRows }} rows scanned
      </Badge>
    </div>

    <div v-if="data.issues.length === 0" class="rounded-2xl border bg-background/80 px-3 py-3 text-sm">
      No anomalies were detected in the requested checks.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(issue, index) in data.issues"
        :key="`${issue.type}-${issue.column || index}`"
        class="rounded-2xl border bg-background/90 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="getSeverityVariant(issue.severity)" class="text-[10px] tracking-[0.16em]">
            {{ issue.severity.toUpperCase() }}
          </Badge>
          <Badge variant="outline" class="text-[10px] tracking-[0.16em]">
            {{ issue.type }}
          </Badge>
          <span v-if="issue.column" class="text-xs text-muted-foreground">
            {{ issue.column }}
          </span>
        </div>

        <p class="mt-3 text-sm leading-6">
          {{ issue.description }}
        </p>

        <details v-if="issue.fixSql" class="mt-3 rounded-xl border bg-muted/30">
          <summary class="cursor-pointer px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Fix suggestion
          </summary>
          <pre class="overflow-x-auto border-t px-3 py-3 text-[12px] leading-6">{{ issue.fixSql }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>
