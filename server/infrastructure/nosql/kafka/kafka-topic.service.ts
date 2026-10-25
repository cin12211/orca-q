import type { Admin, ClusterMetadata } from '@platformatic/kafka';
import type {
  KafkaClusterOverview,
  KafkaConfigEntry,
  KafkaPartitionInfo,
  KafkaTopicConsumerGroup,
  KafkaTopicDetail,
  KafkaTopicSummary,
} from '~/core/types/kafka.types';
import {
  BrokerConnectionError,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  bigintToNumber,
  KAFKA_EARLIEST_TIMESTAMP,
  KAFKA_LATEST_TIMESTAMP,
  lagOf,
  listPartitionOffsets,
} from './kafka-offsets';
import { withKafkaAdmin } from './kafka.client';

const TOPIC_CONFIG_RESOURCE = 2;
const DEFAULT_CONFIG_SOURCE = 5;
const NO_LEADER = -1;

/** Kafka marks its own topics with a double underscore prefix. */
export const isInternalKafkaTopic = (name: string) => name.startsWith('__');

type PartitionSizeMap = Map<string, Map<number, number>>;

interface TopicSnapshot {
  metadata: ClusterMetadata;
  /** Topics with readable metadata (the client omits Kafka's internal ones). */
  topicNames: string[];
  internalTopicCount: number;
  startOffsets: Map<string, Map<number, bigint>>;
  endOffsets: Map<string, Map<number, bigint>>;
  sizes: PartitionSizeMap | null;
  brokerSizes: Map<number, number> | null;
}

/**
 * Partition sizes per replica. The largest replica is used as the partition
 * size so replicated topics are not counted several times.
 */
async function readLogDirSizes(
  admin: Admin,
  partitionsByTopic: Map<string, number[]>
) {
  const topics = [...partitionsByTopic.entries()].map(([name, partitions]) => ({
    name,
    partitions,
  }));

  if (!topics.length) {
    return {
      sizes: new Map() as PartitionSizeMap,
      brokerSizes: new Map<number, number>(),
    };
  }

  try {
    const brokers = await admin.describeLogDirs({ topics });
    const sizes: PartitionSizeMap = new Map();
    const brokerSizes = new Map<number, number>();

    for (const broker of brokers) {
      for (const logDir of broker.results) {
        for (const topic of logDir.topics) {
          const topicSizes = sizes.get(topic.name) ?? new Map<number, number>();
          for (const partition of topic.partitions) {
            const size = bigintToNumber(partition.partitionSize);
            topicSizes.set(
              partition.partitionIndex,
              Math.max(topicSizes.get(partition.partitionIndex) ?? 0, size)
            );
            brokerSizes.set(
              broker.broker,
              (brokerSizes.get(broker.broker) ?? 0) + size
            );
          }
          sizes.set(topic.name, topicSizes);
        }
      }
    }

    return { sizes, brokerSizes };
  } catch {
    // DescribeLogDirs needs cluster-level permission; sizes are optional.
    return { sizes: null, brokerSizes: null };
  }
}

async function readTopicSnapshot(
  admin: Admin,
  topicFilter?: string[]
): Promise<TopicSnapshot> {
  const topicNames =
    topicFilter ?? (await admin.listTopics({ includeInternals: true }));
  const internalTopicCount = topicNames.filter(isInternalKafkaTopic).length;
  const metadata = await admin.metadata({ topics: topicNames });
  const partitionsByTopic = new Map<string, number[]>();

  for (const name of topicNames) {
    const topic = metadata.topics.get(name);
    if (topic?.partitions) {
      partitionsByTopic.set(
        name,
        topic.partitions.map((_, index) => index)
      );
    }
  }

  const [startOffsets, endOffsets, logDirs] = await Promise.all([
    listPartitionOffsets(admin, partitionsByTopic, KAFKA_EARLIEST_TIMESTAMP),
    listPartitionOffsets(admin, partitionsByTopic, KAFKA_LATEST_TIMESTAMP),
    readLogDirSizes(admin, partitionsByTopic),
  ]);

  return {
    metadata,
    topicNames: [...partitionsByTopic.keys()].sort(),
    internalTopicCount,
    startOffsets,
    endOffsets,
    sizes: logDirs.sizes,
    brokerSizes: logDirs.brokerSizes,
  };
}

function buildPartitions(
  snapshot: TopicSnapshot,
  name: string
): KafkaPartitionInfo[] {
  const topic = snapshot.metadata.topics.get(name);
  if (!topic) return [];

  return topic.partitions.map((partition, index) => {
    const start = snapshot.startOffsets.get(name)?.get(index) ?? 0n;
    const end = snapshot.endOffsets.get(name)?.get(index) ?? 0n;

    return {
      partition: index,
      leader: partition.leader,
      replicas: partition.replicas,
      isr: partition.isr,
      offlineReplicas: partition.offlineReplicas,
      startOffset: start.toString(),
      endOffset: end.toString(),
      messageCount: bigintToNumber(end > start ? end - start : 0n),
      sizeBytes:
        snapshot.sizes?.get(name)?.get(index) ?? (snapshot.sizes ? 0 : null),
    };
  });
}

function summarizeTopic(
  snapshot: TopicSnapshot,
  name: string
): KafkaTopicSummary {
  const partitions = buildPartitions(snapshot, name);

  return {
    name,
    isInternal: isInternalKafkaTopic(name),
    partitionCount: partitions.length,
    replicationFactor: partitions[0]?.replicas.length ?? 0,
    messageCount: partitions.reduce((sum, item) => sum + item.messageCount, 0),
    sizeBytes: snapshot.sizes
      ? partitions.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0)
      : null,
    underReplicatedPartitions: partitions.filter(
      item => item.isr.length < item.replicas.length
    ).length,
    offlinePartitions: partitions.filter(item => item.leader === NO_LEADER)
      .length,
  };
}

export async function listKafkaTopics(
  input: BrokerConnectionInput
): Promise<KafkaTopicSummary[]> {
  return withKafkaAdmin(input, async admin => {
    const snapshot = await readTopicSnapshot(admin);
    return snapshot.topicNames.map(name => summarizeTopic(snapshot, name));
  });
}

export async function getKafkaClusterOverview(
  input: BrokerConnectionInput
): Promise<KafkaClusterOverview> {
  return withKafkaAdmin(input, async admin => {
    const [snapshot, groups] = await Promise.all([
      readTopicSnapshot(admin),
      admin.listGroups(),
    ]);
    const summaries = snapshot.topicNames.map(name =>
      summarizeTopic(snapshot, name)
    );

    return {
      clusterId: snapshot.metadata.id,
      controllerId: snapshot.metadata.controllerId,
      brokers: [...snapshot.metadata.brokers.entries()]
        .map(([id, broker]) => ({
          id,
          host: broker.host,
          port: broker.port,
          rack: broker.rack ?? null,
          isController: id === snapshot.metadata.controllerId,
          logDirBytes:
            snapshot.brokerSizes?.get(id) ?? (snapshot.brokerSizes ? 0 : null),
        }))
        .sort((left, right) => left.id - right.id),
      topicCount: summaries.filter(topic => !topic.isInternal).length,
      internalTopicCount: snapshot.internalTopicCount,
      partitionCount: summaries.reduce(
        (sum, topic) => sum + topic.partitionCount,
        0
      ),
      underReplicatedPartitions: summaries.reduce(
        (sum, topic) => sum + topic.underReplicatedPartitions,
        0
      ),
      offlinePartitions: summaries.reduce(
        (sum, topic) => sum + topic.offlinePartitions,
        0
      ),
      consumerGroupCount: groups.size,
    };
  });
}

async function readTopicConsumerGroups(
  admin: Admin,
  topicName: string,
  endOffsets: Map<number, bigint> | undefined
): Promise<KafkaTopicConsumerGroup[]> {
  const groups = await admin.listGroups();
  if (!groups.size) return [];

  const committed = await admin.listConsumerGroupOffsets({
    groups: [...groups.keys()],
  });

  return committed.flatMap(group => {
    const topic = group.topics.find(item => item.name === topicName);
    if (!topic) return [];

    const lag = topic.partitions.reduce(
      (sum, partition) =>
        sum +
        lagOf(
          endOffsets?.get(partition.partitionIndex) ?? 0n,
          partition.committedOffset
        ),
      0
    );

    return [
      {
        groupId: group.groupId,
        state: groups.get(group.groupId)?.state ?? 'Unknown',
        lag,
      },
    ];
  });
}

export async function getKafkaTopicDetail(
  input: BrokerConnectionInput,
  topicName: string
): Promise<KafkaTopicDetail> {
  return withKafkaAdmin(input, async admin => {
    const snapshot = await readTopicSnapshot(admin, [topicName]);

    if (!snapshot.metadata.topics.get(topicName)?.partitions) {
      throw new BrokerConnectionError(`Topic "${topicName}" was not found.`);
    }

    const [configs, consumerGroups] = await Promise.all([
      admin.describeConfigs({
        resources: [
          {
            resourceType: TOPIC_CONFIG_RESOURCE,
            resourceName: topicName,
            configurationKeys: [],
          },
        ],
      }),
      readTopicConsumerGroups(
        admin,
        topicName,
        snapshot.endOffsets.get(topicName)
      ),
    ]);

    const configEntries: KafkaConfigEntry[] = (configs[0]?.configs ?? [])
      .map(config => ({
        name: config.name,
        value: config.isSensitive ? null : (config.value ?? null),
        isDefault: config.configSource === DEFAULT_CONFIG_SOURCE,
        isSensitive: config.isSensitive,
        isReadOnly: config.readOnly,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      name: topicName,
      isInternal: isInternalKafkaTopic(topicName),
      partitions: buildPartitions(snapshot, topicName),
      configs: configEntries,
      consumerGroups,
    };
  });
}
