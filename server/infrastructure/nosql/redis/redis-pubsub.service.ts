import type {
  RedisPubSubMessage,
  RedisPubSubMessagesResponse,
  RedisPubSubOverview,
  RedisPubSubSubscriptionMode,
  RedisPubSubSubscriptionStatus,
  RedisPubSubSubscriptionTarget,
} from '~/core/types/redis-workspace.types';
import {
  createRedisRuntimeClient,
  type RedisRuntimeInput,
} from './redis.client';

export interface RedisPubSubInput extends RedisRuntimeInput {
  databaseIndex?: number;
}

type RedisRuntime = Awaited<ReturnType<typeof createRedisRuntimeClient>>;

interface RedisPubSubSession {
  id: string;
  targets: RedisPubSubSubscriptionTarget[];
  databaseIndex: number;
  runtime: RedisRuntime;
  messages: RedisPubSubMessage[];
}

const MAX_MESSAGES = 200;
const pubSubSessions = new Map<string, RedisPubSubSession>();

const resolveDatabaseIndex = (input: RedisPubSubInput) => {
  const parsed =
    input.databaseIndex ?? Number.parseInt(input.database ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inferRedisPubSubMode = (target: string): RedisPubSubSubscriptionMode => {
  return /[*?[\]]/.test(target) ? 'pattern' : 'channel';
};

const buildSubscriptionStatus = (
  session?: RedisPubSubSession
): RedisPubSubSubscriptionStatus => {
  const primaryTarget = session?.targets[0] ?? null;

  return {
    sessionId: session?.id ?? null,
    target: primaryTarget?.target ?? null,
    mode: primaryTarget?.mode ?? null,
    targets: session?.targets ?? [],
  };
};

const pushPubSubMessage = (
  session: RedisPubSubSession,
  channel: string,
  payload: string,
  pattern: string | null
) => {
  session.messages = [
    ...session.messages,
    {
      id: crypto.randomUUID(),
      channel,
      payload,
      pattern,
      receivedAt: new Date().toISOString(),
    },
  ].slice(-MAX_MESSAGES);
};

const withSelectedDatabase = async <T>(
  input: RedisPubSubInput,
  run: (runtime: RedisRuntime) => Promise<T>
) => {
  const databaseIndex = resolveDatabaseIndex(input);
  const runtime = await createRedisRuntimeClient({
    ...input,
    database: `${databaseIndex}`,
  });

  try {
    if (databaseIndex > 0) {
      await runtime.client.select(databaseIndex);
    }

    return await run(runtime);
  } finally {
    await runtime.close();
  }
};

const parsePubSubNumSub = (raw: unknown) => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const channels = [] as RedisPubSubOverview['channels'];

  for (let index = 0; index < raw.length; index += 2) {
    channels.push({
      channel: String(raw[index] ?? ''),
      subscribers: Number(raw[index + 1] ?? 0),
    });
  }

  return channels;
};

const getSessionById = (sessionId?: string | null) => {
  if (!sessionId) {
    return undefined;
  }

  return pubSubSessions.get(sessionId);
};

const createRedisPubSubSession = async (
  input: RedisPubSubInput,
  databaseIndex: number
) => {
  const runtime = await createRedisRuntimeClient({
    ...input,
    database: `${databaseIndex}`,
  });

  if (databaseIndex > 0) {
    await runtime.client.select(databaseIndex);
  }

  const session: RedisPubSubSession = {
    id: crypto.randomUUID(),
    targets: [],
    databaseIndex,
    runtime,
    messages: [],
  };

  pubSubSessions.set(session.id, session);

  return session;
};

const subscribeTarget = async (
  session: RedisPubSubSession,
  subscriptionTarget: RedisPubSubSubscriptionTarget
) => {
  if (subscriptionTarget.mode === 'pattern') {
    await session.runtime.client.pSubscribe(
      subscriptionTarget.target,
      (payload, channel) => {
        pushPubSubMessage(session, channel, payload, subscriptionTarget.target);
      }
    );

    return;
  }

  await session.runtime.client.subscribe(subscriptionTarget.target, payload => {
    pushPubSubMessage(session, subscriptionTarget.target, payload, null);
  });
};

const unsubscribeTarget = async (
  session: RedisPubSubSession,
  subscriptionTarget: RedisPubSubSubscriptionTarget
) => {
  if (subscriptionTarget.mode === 'pattern') {
    await session.runtime.client.pUnsubscribe(subscriptionTarget.target);
    return;
  }

  await session.runtime.client.unsubscribe(subscriptionTarget.target);
};

export async function getRedisPubSubOverview(
  input: RedisPubSubInput,
  sessionId?: string | null
): Promise<RedisPubSubOverview> {
  return withSelectedDatabase(input, async runtime => {
    const rawChannels = await runtime.client.sendCommand([
      'PUBSUB',
      'CHANNELS',
    ]);
    const channelNames = Array.isArray(rawChannels)
      ? rawChannels.map(channel => String(channel))
      : [];
    const rawCounts = channelNames.length
      ? await runtime.client.sendCommand(['PUBSUB', 'NUMSUB', ...channelNames])
      : [];
    const rawPatternCount = await runtime.client.sendCommand([
      'PUBSUB',
      'NUMPAT',
    ]);
    const session = getSessionById(sessionId);

    return {
      channels: parsePubSubNumSub(rawCounts),
      patterns:
        session?.targets
          .filter(target => target.mode === 'pattern')
          .map(target => target.target) ?? [],
      patternCount: Number(rawPatternCount ?? 0),
      subscription: buildSubscriptionStatus(session),
    };
  });
}

export async function subscribeRedisPubSub(
  input: RedisPubSubInput,
  target: string,
  existingSessionId?: string | null
): Promise<RedisPubSubMessagesResponse> {
  const normalizedTarget = target.trim();

  if (!normalizedTarget) {
    throw new Error('A Redis channel or pattern is required.');
  }

  const databaseIndex = resolveDatabaseIndex(input);
  let session = getSessionById(existingSessionId);

  if (session && session.databaseIndex !== databaseIndex) {
    await closeRedisPubSubSession(existingSessionId);
    session = undefined;
  }

  if (!session) {
    session = await createRedisPubSubSession(input, databaseIndex);
  }

  const subscriptionTarget: RedisPubSubSubscriptionTarget = {
    target: normalizedTarget,
    mode: inferRedisPubSubMode(normalizedTarget),
  };

  const alreadySubscribed = session.targets.some(
    item =>
      item.target === subscriptionTarget.target &&
      item.mode === subscriptionTarget.mode
  );

  if (!alreadySubscribed) {
    await subscribeTarget(session, subscriptionTarget);
    session.targets = [...session.targets, subscriptionTarget];
  }

  return {
    messages: session.messages,
    subscription: buildSubscriptionStatus(session),
  };
}

export async function getRedisPubSubMessages(
  sessionId?: string | null
): Promise<RedisPubSubMessagesResponse> {
  const session = getSessionById(sessionId);

  return {
    messages: session?.messages ?? [],
    subscription: buildSubscriptionStatus(session),
  };
}

export async function publishRedisPubSubMessage(
  input: RedisPubSubInput,
  channel: string,
  payload: string
) {
  const normalizedChannel = channel.trim();

  if (!normalizedChannel) {
    throw new Error('A Redis channel is required to publish a message.');
  }

  return withSelectedDatabase(input, async runtime => {
    const subscribers = await runtime.client.publish(
      normalizedChannel,
      payload
    );

    return {
      channel: normalizedChannel,
      payload,
      subscribers,
    };
  });
}

export async function closeRedisPubSubSession(sessionId?: string | null) {
  const session = getSessionById(sessionId);

  if (!session) {
    return { closed: false };
  }

  const targets = [...session.targets];

  try {
    for (const subscriptionTarget of targets) {
      await unsubscribeTarget(session, subscriptionTarget);
    }
  } finally {
    pubSubSessions.delete(session.id);
    await session.runtime.close();
  }

  return { closed: true };
}

export async function unsubscribeRedisPubSubTarget(
  sessionId?: string | null,
  target?: string | null
) {
  const session = getSessionById(sessionId);

  if (!session) {
    return { closed: false };
  }

  const normalizedTarget = target?.trim();

  if (!normalizedTarget) {
    return closeRedisPubSubSession(sessionId);
  }

  const matchedTarget = session.targets.find(
    item => item.target === normalizedTarget
  );

  if (!matchedTarget) {
    return { closed: false };
  }

  await unsubscribeTarget(session, matchedTarget);
  session.targets = session.targets.filter(
    item => item.target !== normalizedTarget
  );

  if (session.targets.length === 0) {
    return closeRedisPubSubSession(sessionId);
  }

  return { closed: false };
}
