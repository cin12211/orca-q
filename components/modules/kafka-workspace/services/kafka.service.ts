import { getBrokerConnectionPayload } from '~/core/helpers/broker-connection';
import type { Connection } from '~/core/stores';
import type {
  KafkaClusterOverview,
  KafkaConsumerGroupDetail,
  KafkaConsumerGroupSummary,
  KafkaLivePollResult,
  KafkaLiveStatus,
  KafkaMessagePage,
  KafkaMessageQuery,
  KafkaProduceInput,
  KafkaProduceResult,
  KafkaTopicDetail,
  KafkaTopicSummary,
} from '~/core/types/kafka.types';

const post = <T>(
  path: string,
  connection: Connection,
  body: Record<string, unknown> = {}
) =>
  $fetch<T>(`/api/kafka/${path}`, {
    method: 'POST',
    body: { connection: getBrokerConnectionPayload(connection), ...body },
  });

export const kafkaService = {
  overview: (connection: Connection) =>
    post<KafkaClusterOverview>('overview', connection),
  topics: (connection: Connection) =>
    post<KafkaTopicSummary[]>('topics', connection),
  topic: (connection: Connection, topic: string) =>
    post<KafkaTopicDetail>('topic', connection, { topic }),
  groups: (connection: Connection) =>
    post<KafkaConsumerGroupSummary[]>('groups', connection),
  group: (connection: Connection, groupId: string) =>
    post<KafkaConsumerGroupDetail>('group', connection, { groupId }),
  messages: (connection: Connection, query: KafkaMessageQuery) =>
    post<KafkaMessagePage>('messages', connection, { ...query }),
  produce: (connection: Connection, message: KafkaProduceInput) =>
    post<KafkaProduceResult>('produce', connection, { ...message }),
  startLive: (connection: Connection, topic: string, partitions?: number[]) =>
    post<KafkaLiveStatus>('live/start', connection, { topic, partitions }),
  pollLive: (sessionId: string, afterSequence: number) =>
    $fetch<KafkaLivePollResult>('/api/kafka/live/poll', {
      method: 'POST',
      body: { sessionId, afterSequence },
    }),
  stopLive: (sessionId: string) =>
    $fetch<{ stopped: boolean }>('/api/kafka/live/stop', {
      method: 'POST',
      body: { sessionId },
    }),
};
