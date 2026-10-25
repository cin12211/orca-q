import { useTabManagement } from '~/core/composables/useTabManagement';
import { useManagementConnectionStore } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { RABBIT_DEFAULT_EXCHANGE_LABEL, RABBIT_TAB_ICONS } from '../constants';

/** Tab ids include the connection so two brokers never share a tab. */
export function useRabbitTabs() {
  const { openBrokerTab } = useTabManagement();
  const connectionStore = useManagementConnectionStore();
  const connectionId = () =>
    connectionStore.selectedConnection?.id ?? 'rabbitmq';

  const openQueue = (vhost: string, queueName: string) =>
    openBrokerTab({
      id: `rabbit-queue-${connectionId()}-${vhost}-${queueName}`,
      name: queueName,
      type: TabViewType.RabbitQueueDetail,
      icon: RABBIT_TAB_ICONS.queue,
      iconClass: 'text-orange-500',
      metadata: { vhost, queueName },
    });

  const openExchange = (vhost: string, exchangeName: string) =>
    openBrokerTab({
      id: `rabbit-exchange-${connectionId()}-${vhost}-${exchangeName}`,
      name: exchangeName || RABBIT_DEFAULT_EXCHANGE_LABEL,
      type: TabViewType.RabbitExchangeDetail,
      icon: RABBIT_TAB_ICONS.exchange,
      iconClass: 'text-orange-500',
      metadata: { vhost, exchangeName },
    });

  const openQueueList = (vhost: string) =>
    openBrokerTab({
      id: `rabbit-queues-${connectionId()}-${vhost}`,
      name: `Queues - ${vhost}`,
      type: TabViewType.RabbitQueueList,
      icon: RABBIT_TAB_ICONS.queueList,
      metadata: { vhost },
    });

  const openConnections = () =>
    openBrokerTab({
      id: `rabbit-connections-${connectionId()}`,
      name: 'Connections',
      type: TabViewType.RabbitConnections,
      icon: RABBIT_TAB_ICONS.connections,
    });

  return { openQueue, openExchange, openQueueList, openConnections };
}
