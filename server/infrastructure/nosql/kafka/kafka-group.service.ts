import type { Admin, ListConsumerGroupOffsetsGroup } from '@platformatic/kafka';
import type {
  KafkaConsumerGroupDetail,
  KafkaConsumerGroupSummary,
  KafkaGroupMember,
} from '~/core/types/kafka.types';
import {
  BrokerConnectionError,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  KAFKA_LATEST_TIMESTAMP,
  lagOf,
  listPartitionOffsets,
  type PartitionOffsetMap,
} from './kafka-offsets';
import { withKafkaAdmin } from './kafka.client';

/** End offsets for every partition a group has committed to. */
async function readEndOffsets(
  admin: Admin,
  committed: ListConsumerGroupOffsetsGroup[]
): Promise<PartitionOffsetMap> {
  const partitionsByTopic = new Map<string, number[]>();

  for (const group of committed) {
    for (const topic of group.topics) {
      const partitions = new Set(partitionsByTopic.get(topic.name) ?? []);
      for (const partition of topic.partitions) {
        partitions.add(partition.partitionIndex);
      }
      partitionsByTopic.set(topic.name, [...partitions]);
    }
  }

  return listPartitionOffsets(admin, partitionsByTopic, KAFKA_LATEST_TIMESTAMP);
}

const groupLag = (
  group: ListConsumerGroupOffsetsGroup,
  ends: PartitionOffsetMap
) =>
  group.topics.reduce(
    (sum, topic) =>
      sum +
      topic.partitions.reduce(
        (topicSum, partition) =>
          topicSum +
          lagOf(
            ends.get(topic.name)?.get(partition.partitionIndex) ?? 0n,
            partition.committedOffset
          ),
        0
      ),
    0
  );

export async function listKafkaConsumerGroups(
  input: BrokerConnectionInput
): Promise<KafkaConsumerGroupSummary[]> {
  return withKafkaAdmin(input, async admin => {
    const groups = await admin.listGroups();
    if (!groups.size) return [];

    const ids = [...groups.keys()];
    const [described, committed] = await Promise.all([
      admin.describeGroups({ groups: ids }),
      admin.listConsumerGroupOffsets({ groups: ids }),
    ]);
    const ends = await readEndOffsets(admin, committed);
    const committedById = new Map(
      committed.map(group => [group.groupId, group])
    );

    return ids
      .map(groupId => {
        const base = groups.get(groupId);
        const group = committedById.get(groupId);

        return {
          groupId,
          state: base?.state ?? 'Unknown',
          protocolType: base?.protocolType ?? '',
          memberCount: described.get(groupId)?.members.size ?? 0,
          topics: group?.topics.map(topic => topic.name).sort() ?? [],
          totalLag: group ? groupLag(group, ends) : 0,
        };
      })
      .sort((left, right) => left.groupId.localeCompare(right.groupId));
  });
}

export async function getKafkaConsumerGroupDetail(
  input: BrokerConnectionInput,
  groupId: string
): Promise<KafkaConsumerGroupDetail> {
  return withKafkaAdmin(input, async admin => {
    const [described, committed] = await Promise.all([
      admin.describeGroups({ groups: [groupId] }),
      admin.listConsumerGroupOffsets({ groups: [groupId] }),
    ]);
    const group = described.get(groupId);

    if (!group || group.state === 'Dead') {
      throw new BrokerConnectionError(
        `Consumer group "${groupId}" was not found.`
      );
    }

    const ends = await readEndOffsets(admin, committed);
    const members: KafkaGroupMember[] = [...group.members.values()].map(
      member => ({
        memberId: member.id,
        clientId: member.clientId,
        clientHost: member.clientHost,
        assignments: [...(member.assignments?.values() ?? [])].map(
          assignment => ({
            topic: assignment.topic,
            partitions: [...assignment.partitions].sort((a, b) => a - b),
          })
        ),
      })
    );
    const ownerByPartition = new Map<string, string>();

    for (const member of members) {
      for (const assignment of member.assignments) {
        for (const partition of assignment.partitions) {
          ownerByPartition.set(
            `${assignment.topic}:${partition}`,
            member.clientId
          );
        }
      }
    }

    const offsets = (committed[0]?.topics ?? []).flatMap(topic =>
      topic.partitions.map(partition => {
        const end = ends.get(topic.name)?.get(partition.partitionIndex) ?? 0n;

        return {
          topic: topic.name,
          partition: partition.partitionIndex,
          committedOffset: partition.committedOffset.toString(),
          endOffset: end.toString(),
          lag: lagOf(end, partition.committedOffset),
          memberClientId:
            ownerByPartition.get(`${topic.name}:${partition.partitionIndex}`) ??
            null,
        };
      })
    );

    offsets.sort(
      (left, right) =>
        left.topic.localeCompare(right.topic) ||
        left.partition - right.partition
    );

    return {
      groupId,
      state: group.state,
      protocol: group.protocol,
      protocolType: group.protocolType,
      members,
      offsets,
      totalLag: offsets.reduce((sum, item) => sum + item.lag, 0),
    };
  });
}
