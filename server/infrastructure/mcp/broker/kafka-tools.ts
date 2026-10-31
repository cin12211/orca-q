import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { McpSession } from '~/core/persist/normalize';
import {
  getKafkaConsumerGroupDetail,
  listKafkaConsumerGroups,
} from '~/server/infrastructure/nosql/kafka/kafka-group.service';
import {
  KAFKA_MAX_MESSAGES_PER_PAGE,
  readKafkaMessages,
} from '~/server/infrastructure/nosql/kafka/kafka-message.service';
import {
  getKafkaClusterOverview,
  getKafkaTopicDetail,
  listKafkaTopics,
} from '~/server/infrastructure/nosql/kafka/kafka-topic.service';
import { jsonResult, withToolErrors } from '../mcp-tool-result';
import {
  brokerConnectionIdSchema,
  clampMessageCount,
  getBrokerConnection,
  toMcpMessage,
} from './broker-tool-utils';

const topicSchema = z.string().min(1).describe('Topic name.');
const readOnly = { readOnlyHint: true } as const;

export function registerKafkaTools(server: McpServer, session: McpSession) {
  const connect = (connectionId: string) =>
    getBrokerConnection(
      session.id,
      connectionId,
      DatabaseClientType.KAFKA,
      'Kafka'
    );

  server.registerTool(
    'kafka_overview',
    {
      title: 'Kafka overview',
      description:
        'Cluster id, controller, brokers, topic/partition counts, under-replicated and offline partitions, consumer group count.',
      inputSchema: { connectionId: brokerConnectionIdSchema },
      annotations: readOnly,
    },
    ({ connectionId }) =>
      withToolErrors(async () =>
        jsonResult(await getKafkaClusterOverview(await connect(connectionId)))
      )
  );

  server.registerTool(
    'kafka_list_topics',
    {
      title: 'List Kafka topics',
      description:
        'Topics with partition count, replication and message totals. Internal topics are hidden unless includeInternal is true.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        includeInternal: z.boolean().optional(),
      },
      annotations: readOnly,
    },
    ({ connectionId, includeInternal }) =>
      withToolErrors(async () => {
        const topics = await listKafkaTopics(await connect(connectionId));
        return jsonResult(
          includeInternal ? topics : topics.filter(topic => !topic.isInternal)
        );
      })
  );

  server.registerTool(
    'kafka_describe_topic',
    {
      title: 'Describe Kafka topic',
      description:
        'Partitions (leader, replicas, ISR, start/end offsets), configs and the consumer groups reading it. Only non-default configs unless includeDefaultConfigs is true.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        topic: topicSchema,
        includeDefaultConfigs: z.boolean().optional(),
      },
      annotations: readOnly,
    },
    ({ connectionId, topic, includeDefaultConfigs }) =>
      withToolErrors(async () => {
        const detail = await getKafkaTopicDetail(
          await connect(connectionId),
          topic
        );
        return jsonResult({
          ...detail,
          configs: includeDefaultConfigs
            ? detail.configs
            : detail.configs.filter(config => !config.isDefault),
        });
      })
  );

  server.registerTool(
    'kafka_read_messages',
    {
      title: 'Read Kafka messages',
      description: `Read records from a topic without joining a consumer group or committing offsets. start: "latest" (newest records, default), "earliest", "offset" (needs offset, usually with one partition) or "timestamp" (epoch ms). Default 20, max ${KAFKA_MAX_MESSAGES_PER_PAGE}. Pass nextCursors back as cursors to continue. Long payloads are cut.`,
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        topic: topicSchema,
        partitions: z
          .array(z.number().int().min(0))
          .optional()
          .describe('Partitions to read; all when omitted.'),
        start: z.enum(['latest', 'earliest', 'offset', 'timestamp']).optional(),
        offset: z.string().optional(),
        timestamp: z.number().int().optional(),
        limit: z.number().int().positive().optional(),
        cursors: z
          .array(z.object({ partition: z.number().int(), offset: z.string() }))
          .optional(),
      },
      annotations: readOnly,
    },
    ({
      connectionId,
      topic,
      partitions,
      start,
      offset,
      timestamp,
      limit,
      cursors,
    }) =>
      withToolErrors(async () => {
        const page = await readKafkaMessages(await connect(connectionId), {
          topic,
          partitions,
          start: start ?? 'latest',
          offset,
          timestamp,
          limit: clampMessageCount(limit, KAFKA_MAX_MESSAGES_PER_PAGE),
          cursors,
        });
        return jsonResult({
          ...page,
          messages: page.messages.map(toMcpMessage),
        });
      })
  );

  server.registerTool(
    'kafka_list_consumer_groups',
    {
      title: 'List Kafka consumer groups',
      description:
        'Consumer groups with state, member count, topics and total lag.',
      inputSchema: { connectionId: brokerConnectionIdSchema },
      annotations: readOnly,
    },
    ({ connectionId }) =>
      withToolErrors(async () =>
        jsonResult(await listKafkaConsumerGroups(await connect(connectionId)))
      )
  );

  server.registerTool(
    'kafka_describe_consumer_group',
    {
      title: 'Describe Kafka consumer group',
      description:
        'One group: members with their assigned partitions, committed offset and lag per partition.',
      inputSchema: {
        connectionId: brokerConnectionIdSchema,
        groupId: z.string().min(1).describe('Consumer group id.'),
      },
      annotations: readOnly,
    },
    ({ connectionId, groupId }) =>
      withToolErrors(async () =>
        jsonResult(
          await getKafkaConsumerGroupDetail(
            await connect(connectionId),
            groupId
          )
        )
      )
  );
}
