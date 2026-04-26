<script setup lang="ts">
import type { DatabaseClientType } from '~/core/constants/database-client-type';

interface Props {
  supportMessage: string;
  connectionType?: DatabaseClientType | null;
}

defineProps<Props>();

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
    </AlertDescription>
  </Alert>
</template>
