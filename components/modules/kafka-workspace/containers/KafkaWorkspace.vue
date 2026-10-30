<script setup lang="ts">
import type { Connection } from '~/core/stores';
import {
  TabViewType,
  type TabView,
} from '~/core/types/entities/tab-view.entity';
import {
  KafkaConsumerGroupDetail,
  KafkaConsumerGroupList,
  KafkaLivePanel,
  KafkaTopicDetail,
  KafkaTopicList,
} from '../components';

const props = defineProps<{ connection: Connection; tabInfo: TabView }>();

const metadata = computed(
  () => (props.tabInfo.metadata ?? {}) as Record<string, string>
);
</script>

<template>
  <KafkaTopicDetail
    v-if="tabInfo.type === TabViewType.KafkaTopicDetail"
    :connection="connection"
    :topic-name="metadata.topicName"
  />
  <KafkaConsumerGroupDetail
    v-else-if="tabInfo.type === TabViewType.KafkaConsumerGroupDetail"
    :connection="connection"
    :group-id="metadata.groupId"
  />
  <KafkaConsumerGroupList
    v-else-if="tabInfo.type === TabViewType.KafkaConsumerGroupList"
    :connection="connection"
  />
  <KafkaLivePanel
    v-else-if="tabInfo.type === TabViewType.KafkaLive"
    :connection="connection"
  />
  <KafkaTopicList v-else :connection="connection" />
</template>
