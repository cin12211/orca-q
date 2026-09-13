import { defineAsyncComponent, type Component } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const lazySqlGuide = defineAsyncComponent(
  () => import('../components/RawQueryVariableUsageGuidePopover.vue')
);
const lazyMongoGuide = defineAsyncComponent(
  () => import('../mongo/components/MongoRawQueryVariableUsageGuidePopover.vue')
);

export const RAW_QUERY_GUIDE_REGISTRY: Partial<
  Record<DatabaseClientType, Component>
> = {
  [DatabaseClientType.POSTGRES]: lazySqlGuide,
  [DatabaseClientType.MYSQL]: lazySqlGuide,
  [DatabaseClientType.MARIADB]: lazySqlGuide,
  [DatabaseClientType.MONGODB]: lazyMongoGuide,
};

export function getRawQueryGuide(
  databaseType?: DatabaseClientType
): Component | null {
  if (!databaseType) {
    return null;
  }

  return RAW_QUERY_GUIDE_REGISTRY[databaseType] ?? null;
}

export function isRawQueryGuideSupported(databaseType?: DatabaseClientType) {
  return Boolean(getRawQueryGuide(databaseType));
}
