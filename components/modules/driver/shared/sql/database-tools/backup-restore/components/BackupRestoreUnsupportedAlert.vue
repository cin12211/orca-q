<script setup lang="ts">
import type { DatabaseClientType } from '~/core/constants/database-client-type';

interface Props {
  supportMessage: string;
  connectionType?: DatabaseClientType | null;
  isLoading?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  reload: [];
}>();

const postgresCode = `brew install postgresql # macOS
apt-get install postgresql-client # Linux
# Windows: Download from https://www.postgresql.org/download/windows/`;

const mysqlCode = `brew install mysql # macOS
apt-get install mysql-client # Linux
# Windows: Download from https://dev.mysql.com/downloads/`;

const sqliteCode = `brew install sqlite # macOS
apt-get install sqlite3 # Linux
# Windows: Download from https://www.sqlite.org/download.html`;
</script>

<template>
  <Alert>
    <AlertTitle class="flex items-center font-medium gap-1">
      <Icon name="hugeicons:alert-circle" class="size-4" />

      Native Tools Required</AlertTitle
    >
    <AlertDescription class="space-y-3">
      <p class="text-muted-foreground">{{ supportMessage }}</p>
      <div class="space-y-2 text-xs">
        <p class="font-medium">Installation instructions:</p>

        <CodeHighlightPreview
          v-if="connectionType === 'postgres'"
          :code="postgresCode"
          language="bash"
        />
        <CodeHighlightPreview
          v-else-if="connectionType === 'mysql' || connectionType === 'mariadb'"
          :code="mysqlCode"
          language="bash"
        />
        <CodeHighlightPreview
          v-else-if="connectionType === 'sqlite3'"
          :code="sqliteCode"
          language="bash"
        />
      </div>

      <div
        class="mt-4 pt-2 border-t border-border/40 flex flex-wrap items-center gap-3"
      >
        <Button
          size="sm"
          variant="outline"
          class="cursor-pointer transition-all duration-300 hover:bg-accent hover:text-accent-foreground active:scale-95 group"
          :disabled="isLoading"
          @click="emit('reload')"
        >
          <Icon
            name="hugeicons:refresh"
            :class="[
              'size-4 mr-2 shrink-0',
              isLoading
                ? 'animate-spin'
                : 'transition-transform duration-500 group-hover:rotate-180',
            ]"
          />
          {{ isLoading ? 'Checking...' : 'Check Again' }}
        </Button>
        <span class="text-[11px] text-muted-foreground">
          Installed the tools? Click check again to re-detect capabilities and
          enable Backup & Restore.
        </span>
      </div>
    </AlertDescription>
  </Alert>
</template>
