import type { BrokerMessage } from './broker-message.types';

export interface KafkaBrokerInfo {
  id: number;
  host: string;
  port: number;
  rack: string | null;
  isController: boolean;
  /** Sum of partition sizes stored on this broker, null without permission. */
  logDirBytes: number | null;
}

export interface KafkaClusterOverview {
  clusterId: string;
  controllerId: number;
  brokers: KafkaBrokerInfo[];
  topicCount: number;
  internalTopicCount: number;
  partitionCount: number;
  underReplicatedPartitions: number;
  offlinePartitions: number;
  consumerGroupCount: number;
}

export interface KafkaTopicSummary {
  name: string;
  isInternal: boolean;
  partitionCount: number;
  replicationFactor: number;
  /** Sum of (end offset - start offset); compacted topics may hold fewer. */
  messageCount: number;
  sizeBytes: number | null;
  underReplicatedPartitions: number;
  offlinePartitions: number;
}

export interface KafkaPartitionInfo {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
  offlineReplicas: number[];
  startOffset: string;
  endOffset: string;
  messageCount: number;
  sizeBytes: number | null;
}

export interface KafkaConfigEntry {
  name: string;
  value: string | null;
  isDefault: boolean;
  isSensitive: boolean;
  isReadOnly: boolean;
}

export interface KafkaTopicConsumerGroup {
  groupId: string;
  state: string;
  lag: number;
}

export interface KafkaTopicDetail {
  name: string;
  isInternal: boolean;
  partitions: KafkaPartitionInfo[];
  configs: KafkaConfigEntry[];
  consumerGroups: KafkaTopicConsumerGroup[];
}

export interface KafkaConsumerGroupSummary {
  groupId: string;
  state: string;
  protocolType: string;
  memberCount: number;
  topics: string[];
  totalLag: number;
}

export interface KafkaGroupMember {
  memberId: string;
  clientId: string;
  clientHost: string;
  assignments: { topic: string; partitions: number[] }[];
}

export interface KafkaGroupPartitionOffset {
  topic: string;
  partition: number;
  committedOffset: string;
  endOffset: string;
  lag: number;
  memberClientId: string | null;
}

export interface KafkaConsumerGroupDetail {
  groupId: string;
  state: string;
  protocol: string;
  protocolType: string;
  members: KafkaGroupMember[];
  offsets: KafkaGroupPartitionOffset[];
  totalLag: number;
}

export type KafkaMessageStart = 'earliest' | 'latest' | 'offset' | 'timestamp';

export interface KafkaPartitionCursor {
  partition: number;
  offset: string;
}

export interface KafkaMessageQuery {
  topic: string;
  /** Empty means every partition. */
  partitions?: number[];
  start: KafkaMessageStart;
  offset?: string;
  /** Epoch milliseconds. */
  timestamp?: number;
  limit?: number;
  /** Continue reading after a previous page. Overrides `start`. */
  cursors?: KafkaPartitionCursor[];
}

export interface KafkaMessagePage {
  messages: BrokerMessage[];
  /** Where each partition would continue on the next page. */
  nextCursors: KafkaPartitionCursor[];
  hasMore: boolean;
}

export interface KafkaProduceInput {
  topic: string;
  key?: string;
  value: string;
  headers?: Record<string, string>;
  partition?: number;
}

export interface KafkaProduceResult {
  partition: number | null;
  offset: string | null;
}

export interface KafkaLiveStatus {
  sessionId: string;
  topic: string;
  isRunning: boolean;
  error: string | null;
}

export interface KafkaLivePollResult extends KafkaLiveStatus {
  messages: BrokerMessage[];
  /** Pass back as `afterSequence` to only receive newer messages. */
  lastSequence: number;
}
