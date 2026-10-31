import { useTabManagement } from '~/core/composables/useTabManagement';
import { useManagementConnectionStore } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { KAFKA_TAB_ICONS } from '../constants';

export function useKafkaTabs() {
  const { openBrokerTab } = useTabManagement();
  const connectionStore = useManagementConnectionStore();
  const connectionId = () => connectionStore.selectedConnection?.id ?? 'kafka';

  const openTopic = (topicName: string) =>
    openBrokerTab({
      id: `kafka-topic-${connectionId()}-${topicName}`,
      name: topicName,
      type: TabViewType.KafkaTopicDetail,
      icon: KAFKA_TAB_ICONS.topic,
      metadata: { topicName },
    });

  const openGroup = (groupId: string) =>
    openBrokerTab({
      id: `kafka-group-${connectionId()}-${groupId}`,
      name: groupId,
      type: TabViewType.KafkaConsumerGroupDetail,
      icon: KAFKA_TAB_ICONS.group,
      metadata: { groupId },
    });

  return { openTopic, openGroup };
}
