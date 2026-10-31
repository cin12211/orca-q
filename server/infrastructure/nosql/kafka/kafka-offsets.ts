import type { Admin } from '@platformatic/kafka';

/** Special timestamps understood by the ListOffsets API. */
export const KAFKA_LATEST_TIMESTAMP = -1n;
export const KAFKA_EARLIEST_TIMESTAMP = -2n;

export type PartitionOffsetMap = Map<string, Map<number, bigint>>;

/** List one offset per partition for many topics in a single request. */
export async function listPartitionOffsets(
  admin: Admin,
  partitionsByTopic: Map<string, number[]>,
  timestamp: bigint
): Promise<PartitionOffsetMap> {
  const result: PartitionOffsetMap = new Map();
  const topics = [...partitionsByTopic.entries()]
    .filter(([, partitions]) => partitions.length)
    .map(([name, partitions]) => ({
      name,
      partitions: partitions.map(partitionIndex => ({
        partitionIndex,
        timestamp,
      })),
    }));

  if (!topics.length) return result;

  const listed = await admin.listOffsets({ topics });

  for (const topic of listed) {
    const offsets = new Map<number, bigint>();
    for (const partition of topic.partitions) {
      offsets.set(partition.partitionIndex, partition.offset);
    }
    result.set(topic.name, offsets);
  }

  return result;
}

export const bigintToNumber = (value: bigint) =>
  value > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : Number(value);

export const lagOf = (endOffset: bigint, committedOffset: bigint) =>
  committedOffset < 0n
    ? 0
    : bigintToNumber(
        endOffset > committedOffset ? endOffset - committedOffset : 0n
      );
