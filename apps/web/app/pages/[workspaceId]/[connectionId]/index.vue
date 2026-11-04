<script setup lang="ts">
import { resolveConnectionProviderKind } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { EConnectionProviderKind } from '~/core/types/entities/connection.entity';

interface EmptyStateCopy {
  title: string;
  description: string;
}

definePageMeta({
  layout: 'default',
});

const SQL_TABLE_COPY = (name: string): EmptyStateCopy => ({
  title: 'No table is open',
  description: `Pick a table, view or function of your ${name} database from the sidebar, or open a SQL file to begin.`,
});

const DEFAULT_COPY: EmptyStateCopy = {
  title: 'No table is open',
  description: 'Click on a database table from the sidebar to begin',
};

/** Copy for connections whose provider differs from the client type. */
const PROVIDER_COPY: Partial<Record<EConnectionProviderKind, EmptyStateCopy>> =
  {
    [EConnectionProviderKind.SQLITE_FILE]: SQL_TABLE_COPY('SQLite'),
    [EConnectionProviderKind.CLOUDFLARE_D1]: SQL_TABLE_COPY('Cloudflare D1'),
    [EConnectionProviderKind.TURSO]: SQL_TABLE_COPY('Turso'),
  };

const TYPE_COPY: Partial<Record<DatabaseClientType, EmptyStateCopy>> = {
  [DatabaseClientType.POSTGRES]: SQL_TABLE_COPY('PostgreSQL'),
  [DatabaseClientType.MYSQL]: SQL_TABLE_COPY('MySQL'),
  [DatabaseClientType.MYSQL2]: SQL_TABLE_COPY('MySQL'),
  [DatabaseClientType.MARIADB]: SQL_TABLE_COPY('MariaDB'),
  [DatabaseClientType.ORACLE]: SQL_TABLE_COPY('Oracle'),
  [DatabaseClientType.SQLITE3]: SQL_TABLE_COPY('SQLite'),
  [DatabaseClientType.BETTER_SQLITE3]: SQL_TABLE_COPY('SQLite'),
  [DatabaseClientType.REDIS]: {
    title: 'No Redis tab is open',
    description:
      'Pick a key from the sidebar to view its value, or open Pub/Sub and Instance Insights from Tools.',
  },
  [DatabaseClientType.MONGODB]: {
    title: 'No collection is open',
    description:
      'Pick a database or collection from the sidebar to browse its documents.',
  },
  [DatabaseClientType.RABBITMQ]: {
    title: 'No RabbitMQ tab is open',
    description:
      'Pick a queue or exchange from the sidebar, or open the Overview from Tools.',
  },
  [DatabaseClientType.KAFKA]: {
    title: 'No Kafka tab is open',
    description:
      'Pick a topic or consumer group from the sidebar, or open the Cluster Overview from Tools.',
  },
};

const connectionStore = useManagementConnectionStore();

const emptyStateCopy = computed<EmptyStateCopy>(() => {
  const connection = connectionStore.selectedConnection;
  if (!connection) return DEFAULT_COPY;

  const providerKind = resolveConnectionProviderKind(connection);

  return (
    PROVIDER_COPY[providerKind] ?? TYPE_COPY[connection.type] ?? DEFAULT_COPY
  );
});
</script>

<template>
  <WorkspaceEmptyState
    :title="emptyStateCopy.title"
    :description="emptyStateCopy.description"
  />
</template>
