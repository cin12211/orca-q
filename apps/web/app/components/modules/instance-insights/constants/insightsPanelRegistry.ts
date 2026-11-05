import { defineAsyncComponent, type Component } from 'vue';
import { getConnectionCapabilityProfile } from '#shared/constants';
import { EConnectionFamily } from '#shared/types/entities/connection.entity';
import type { Connection } from '~/core/stores';

// Exception to the constants layer rule: this registry is the host's only
// link to the family modules, so it lazy-loads their public panels here.
// Every panel takes the same `{ connection: Connection }` props.
const SqlInstanceInsightsPanel = defineAsyncComponent(() =>
  import('~/components/modules/sql-family-workspace').then(
    module => module.SqlInstanceInsightsPanel
  )
);

export const INSTANCE_INSIGHTS_PANEL_REGISTRY: Record<
  EConnectionFamily,
  Component
> = {
  [EConnectionFamily.SQL]: SqlInstanceInsightsPanel,
  [EConnectionFamily.REDIS]: defineAsyncComponent(() =>
    import('~/components/modules/redis-workspace').then(
      module => module.RedisInstanceInsightsPanel
    )
  ),
  [EConnectionFamily.RABBITMQ]: defineAsyncComponent(() =>
    import('~/components/modules/rabbitmq-workspace').then(
      module => module.RabbitInstanceInsightsPanel
    )
  ),
  [EConnectionFamily.KAFKA]: defineAsyncComponent(() =>
    import('~/components/modules/kafka-workspace').then(
      module => module.KafkaInstanceInsightsPanel
    )
  ),
  [EConnectionFamily.MONGODB]: defineAsyncComponent(() =>
    import('~/components/modules/mongodb-workspace').then(
      module => module.MongoInstanceInsightsPanel
    )
  ),
};

export const resolveInstanceInsightsPanel = (
  connection: Connection
): Component =>
  INSTANCE_INSIGHTS_PANEL_REGISTRY[
    getConnectionCapabilityProfile(connection).family
  ];
