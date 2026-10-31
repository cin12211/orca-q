import type { ClusterTopicMetadata, Consumer } from '@platformatic/kafka';
import type {
  KafkaMessagePage,
  KafkaMessageQuery,
  KafkaPartitionCursor,
  KafkaProduceInput,
  KafkaProduceResult,
} from '~/core/types/kafka.types';
import {
  BrokerConnectionError,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  KAFKA_EARLIEST_TIMESTAMP,
  KAFKA_LATEST_TIMESTAMP,
  listPartitionOffsets,
} from './kafka-offsets';
import { decodeRecordBatches, type DecodedKafkaRecord } from './kafka-record';
import {
  createKafkaReader,
  readKafkaTopicMetadata,
  withKafkaAdmin,
  withKafkaProducer,
} from './kafka.client';

export const KAFKA_MAX_MESSAGES_PER_PAGE = 100;
const FETCH_MAX_BYTES = 1024 * 1024;
const FETCH_MAX_WAIT_MS = 200;
/** Stop after this many empty fetches (e.g. a range made only of aborted records). */
const MAX_FETCH_ROUNDS = 10;

export interface PartitionFetchTarget {
  topicId: string;
  partition: number;
  leader: number;
}

/** One fetch request to the partition leader, without joining any group. */
export async function fetchPartitionOnce(
  reader: Consumer,
  target: PartitionFetchTarget,
  fromOffset: bigint,
  maxWaitTime = FETCH_MAX_WAIT_MS
) {
  const response = await reader.fetch({
    node: target.leader,
    maxWaitTime,
    maxBytes: FETCH_MAX_BYTES,
    topics: [
      {
        topicId: target.topicId,
        partitions: [
          {
            partition: target.partition,
            fetchOffset: fromOffset,
            partitionMaxBytes: FETCH_MAX_BYTES,
            currentLeaderEpoch: -1,
            lastFetchedEpoch: -1,
          },
        ],
      },
    ],
  });
  const partition = response.responses[0]?.partitions[0];

  return {
    highWatermark: partition?.highWatermark ?? fromOffset,
    records: partition?.records,
  };
}

async function readPartitionRange(
  reader: Consumer,
  context: { topic: string; target: PartitionFetchTarget },
  range: { from: bigint; end: bigint; limit: number }
) {
  const collected: DecodedKafkaRecord[] = [];
  let next = range.from;

  for (let round = 0; round < MAX_FETCH_ROUNDS; round++) {
    if (collected.length >= range.limit || next >= range.end) break;

    const { records } = await fetchPartitionOnce(reader, context.target, next);
    const decoded = decodeRecordBatches(records, {
      topic: context.topic,
      partition: context.target.partition,
      fromOffset: next,
    }).filter(item => item.offset < range.end);

    if (!decoded.length) break;

    collected.push(...decoded.slice(0, range.limit - collected.length));
    next = collected[collected.length - 1].offset + 1n;
  }

  return { records: collected, next };
}

export function resolveFetchTargets(
  topicName: string,
  topic: ClusterTopicMetadata | undefined,
  partitions?: number[]
): PartitionFetchTarget[] {
  if (!topic?.partitions) {
    throw new BrokerConnectionError(`Topic "${topicName}" was not found.`);
  }

  const wanted = partitions?.length
    ? new Set(partitions)
    : new Set(topic.partitions.map((_, index) => index));

  return topic.partitions
    .map((partition, index) => ({
      topicId: topic.id,
      partition: index,
      leader: partition.leader,
    }))
    .filter(target => wanted.has(target.partition));
}

const clampOffset = (value: bigint, start: bigint, end: bigint) =>
  value < start ? start : value > end ? end : value;

function parseOffset(value?: string) {
  try {
    return value === undefined || value === '' ? 0n : BigInt(value);
  } catch {
    throw new BrokerConnectionError(`"${value}" is not a valid offset.`);
  }
}

export async function readKafkaMessages(
  input: BrokerConnectionInput,
  query: KafkaMessageQuery
): Promise<KafkaMessagePage> {
  const limit = Math.min(
    KAFKA_MAX_MESSAGES_PER_PAGE,
    Math.max(1, query.limit ?? 50)
  );
  return withKafkaAdmin(input, async admin => {
    const reader = await createKafkaReader(input);

    try {
      const metadata = await readKafkaTopicMetadata(admin, [query.topic]);
      const targets = resolveFetchTargets(
        query.topic,
        metadata.topics.get(query.topic),
        query.cursors?.length
          ? query.cursors.map(cursor => cursor.partition)
          : query.partitions
      );
      const partitionsByTopic = new Map([
        [query.topic, targets.map(target => target.partition)],
      ]);
      const [starts, ends, byTimestamp] = await Promise.all([
        listPartitionOffsets(
          admin,
          partitionsByTopic,
          KAFKA_EARLIEST_TIMESTAMP
        ),
        listPartitionOffsets(admin, partitionsByTopic, KAFKA_LATEST_TIMESTAMP),
        query.start === 'timestamp' && !query.cursors?.length
          ? listPartitionOffsets(
              admin,
              partitionsByTopic,
              BigInt(Math.max(0, Math.trunc(query.timestamp ?? 0)))
            )
          : Promise.resolve(null),
      ]);
      const perPartition = Math.max(1, Math.ceil(limit / targets.length));
      const cursorByPartition = new Map(
        (query.cursors ?? []).map(cursor => [
          cursor.partition,
          parseOffset(cursor.offset),
        ])
      );

      const results = await Promise.all(
        targets.map(async target => {
          const start = starts.get(query.topic)?.get(target.partition) ?? 0n;
          const end = ends.get(query.topic)?.get(target.partition) ?? 0n;
          let from: bigint;

          if (cursorByPartition.has(target.partition)) {
            from = cursorByPartition.get(target.partition) ?? start;
          } else if (query.start === 'latest') {
            from = end - BigInt(perPartition);
          } else if (query.start === 'offset') {
            from = parseOffset(query.offset);
          } else if (query.start === 'timestamp') {
            const found = byTimestamp?.get(query.topic)?.get(target.partition);
            // -1 means no message at or after the timestamp.
            from = found === undefined || found < 0n ? end : found;
          } else {
            from = start;
          }

          from = clampOffset(from, start, end);
          const read = await readPartitionRange(
            reader,
            { topic: query.topic, target },
            { from, end, limit: perPartition }
          );

          return { target, end, ...read };
        })
      );

      // "Newest" lists the most recent message first, other modes read forward.
      const direction =
        query.start === 'latest' && !query.cursors?.length ? -1 : 1;
      const messages = results
        .flatMap(result => result.records.map(record => record.message))
        .sort(
          (left, right) =>
            direction *
            ((left.timestamp ?? '').localeCompare(right.timestamp ?? '') ||
              (left.partition ?? 0) - (right.partition ?? 0) ||
              Number(BigInt(left.offset ?? '0') - BigInt(right.offset ?? '0')))
        )
        .slice(0, limit);
      const nextCursors: KafkaPartitionCursor[] = results.map(result => ({
        partition: result.target.partition,
        offset: result.next.toString(),
      }));

      return {
        messages,
        nextCursors,
        hasMore: results.some(result => result.next < result.end),
      };
    } finally {
      await reader.close().catch(() => undefined);
    }
  });
}

export async function produceKafkaMessage(
  input: BrokerConnectionInput,
  message: KafkaProduceInput
): Promise<KafkaProduceResult> {
  return withKafkaProducer(input, async producer => {
    const result = await producer.send({
      messages: [
        {
          topic: message.topic,
          key: message.key || undefined,
          value: message.value,
          headers: message.headers,
          partition: message.partition,
        },
      ],
    });
    const written = result.offsets?.[0];

    return {
      partition: written?.partition ?? null,
      offset: written ? written.offset.toString() : null,
    };
  });
}
