import type { Consumer } from '@platformatic/kafka';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import type {
  KafkaLivePollResult,
  KafkaLiveStatus,
} from '~/core/types/kafka.types';
import {
  BrokerConnectionError,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  fetchPartitionOnce,
  resolveFetchTargets,
  type PartitionFetchTarget,
} from './kafka-message.service';
import { KAFKA_LATEST_TIMESTAMP, listPartitionOffsets } from './kafka-offsets';
import { decodeRecordBatches } from './kafka-record';
import {
  createKafkaReader,
  readKafkaTopicMetadata,
  withKafkaAdmin,
} from './kafka.client';

const MAX_BUFFERED_MESSAGES = 500;
const MAX_LIVE_SESSIONS = 20;
/** Sessions nobody polled for this long are closed so no reader lingers. */
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const LIVE_FETCH_WAIT_MS = 500;
const IDLE_SLEEP_MS = 500;

interface LiveSession {
  id: string;
  topic: string;
  reader: Consumer;
  targets: PartitionFetchTarget[];
  cursors: Map<number, bigint>;
  buffer: { sequence: number; message: BrokerMessage }[];
  sequence: number;
  isRunning: boolean;
  error: string | null;
  lastPolledAt: number;
}

const sessions = new Map<string, LiveSession>();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const toStatus = (session: LiveSession): KafkaLiveStatus => ({
  sessionId: session.id,
  topic: session.topic,
  isRunning: session.isRunning,
  error: session.error,
});

async function closeSession(session: LiveSession) {
  session.isRunning = false;
  sessions.delete(session.id);
  await session.reader.close().catch(() => undefined);
}

async function runLoop(session: LiveSession) {
  while (session.isRunning) {
    if (Date.now() - session.lastPolledAt > IDLE_TIMEOUT_MS) {
      await closeSession(session);
      return;
    }

    let received = 0;

    try {
      for (const target of session.targets) {
        if (!session.isRunning) return;

        const from = session.cursors.get(target.partition) ?? 0n;
        const { records } = await fetchPartitionOnce(
          session.reader,
          target,
          from,
          LIVE_FETCH_WAIT_MS / session.targets.length
        );
        const decoded = decodeRecordBatches(records, {
          topic: session.topic,
          partition: target.partition,
          fromOffset: from,
        });

        for (const record of decoded) {
          session.sequence += 1;
          session.buffer.push({
            sequence: session.sequence,
            message: record.message,
          });
        }

        if (decoded.length) {
          session.cursors.set(
            target.partition,
            decoded[decoded.length - 1].offset + 1n
          );
          received += decoded.length;
        }
      }

      if (session.buffer.length > MAX_BUFFERED_MESSAGES) {
        session.buffer = session.buffer.slice(-MAX_BUFFERED_MESSAGES);
      }
    } catch (error) {
      session.error = error instanceof Error ? error.message : String(error);
      await closeSession(session);
      return;
    }

    if (!received) await sleep(IDLE_SLEEP_MS);
  }
}

async function closeIdleSessions() {
  const now = Date.now();
  for (const session of [...sessions.values()]) {
    if (now - session.lastPolledAt > IDLE_TIMEOUT_MS) {
      await closeSession(session);
    }
  }
}

/** Start tailing a topic from its current end. Nothing is committed. */
export async function startKafkaLive(
  input: BrokerConnectionInput,
  options: { topic: string; partitions?: number[] }
): Promise<KafkaLiveStatus> {
  await closeIdleSessions();

  if (sessions.size >= MAX_LIVE_SESSIONS) {
    throw new BrokerConnectionError(
      'Too many live views are open.',
      'Close another Kafka live tab and try again.'
    );
  }

  const { targets, ends } = await withKafkaAdmin(input, async admin => {
    const metadata = await readKafkaTopicMetadata(admin, [options.topic]);
    const resolved = resolveFetchTargets(
      options.topic,
      metadata.topics.get(options.topic),
      options.partitions
    );
    const offsets = await listPartitionOffsets(
      admin,
      new Map([[options.topic, resolved.map(target => target.partition)]]),
      KAFKA_LATEST_TIMESTAMP
    );

    return { targets: resolved, ends: offsets };
  });
  const reader = await createKafkaReader(input);

  try {
    const session: LiveSession = {
      id: crypto.randomUUID(),
      topic: options.topic,
      reader,
      targets,
      cursors: new Map(
        targets.map(target => [
          target.partition,
          ends.get(options.topic)?.get(target.partition) ?? 0n,
        ])
      ),
      buffer: [],
      sequence: 0,
      isRunning: true,
      error: null,
      lastPolledAt: Date.now(),
    };

    sessions.set(session.id, session);
    void runLoop(session);

    return toStatus(session);
  } catch (error) {
    await reader.close().catch(() => undefined);
    throw error;
  }
}

export function pollKafkaLive(
  sessionId: string,
  afterSequence = 0
): KafkaLivePollResult {
  const session = sessions.get(sessionId);

  if (!session) {
    return {
      sessionId,
      topic: '',
      isRunning: false,
      error: 'This live view has stopped. Start it again to keep watching.',
      messages: [],
      lastSequence: afterSequence,
    };
  }

  session.lastPolledAt = Date.now();
  const fresh = session.buffer.filter(item => item.sequence > afterSequence);

  return {
    ...toStatus(session),
    messages: fresh.map(item => item.message),
    lastSequence: fresh.length
      ? fresh[fresh.length - 1].sequence
      : afterSequence,
  };
}

export async function stopKafkaLive(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) await closeSession(session);
  return { stopped: Boolean(session) };
}
