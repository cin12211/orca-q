import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RedisClientType } from 'redis';

type SeedCounts = {
  cachePageCount: number;
  orderHashCount: number;
  sessionHashCount: number;
  leaderboardEntryCount: number;
  streamEntryCount: number;
};

type RedisSampleConfig = {
  counts: SeedCounts;
  core: {
    ordersString: { key: string; value: string };
    ordersHash: { key: string; value: Record<string, string> };
    ordersQueue: { key: string; value: string[] };
    theme: { key: string; value: string };
    dashboardCache: {
      key: string;
      ttlSeconds: number;
      value: Record<string, unknown>;
    };
    processedCounter: { key: string; initial: number; incrementBy: number };
    otp: { key: string; value: string; ttlSeconds: number };
    bitmap: { key: string; bits: number[] };
    bitfield: {
      key: string;
      entries: Array<{ type: string; offset: number; value: number }>;
    };
    customerHash: { key: string; value: Record<string, string> };
    inventoryHash: { key: string; value: Record<string, string> };
    emailQueue: { key: string; prefix: string; count: number };
    orderTimeline: { key: string; prefix: string; count: number };
    orderTags: { key: string; value: string[] };
    enabledFeatures: { key: string; value: string[] };
    apacMembers: { key: string; prefix: string; count: number };
    recentOrders: {
      key: string;
      count: number;
      memberPrefix: string;
      scoreStart: number;
      scoreStep: number;
    };
    dailyLeaderboard: {
      key: string;
      count: number;
      memberPrefix: string;
      scoreStart: number;
      scoreStep: number;
    };
    warehousesGeo: {
      key: string;
      members: Array<{
        member: string;
        longitude: number;
        latitude: number;
      }>;
    };
    ordersStream: { key: string };
    auditStream: { key: string };
  };
};

const redisSampleConfig = JSON.parse(
  readFileSync(
    path.resolve(
      process.cwd(),
      'test/fixtures/datasets/redis/redis-sample-data.json'
    ),
    'utf8'
  )
) as RedisSampleConfig;

const defaultCounts = redisSampleConfig.counts;

async function seedCoreKeys(client: RedisClientType) {
  const { core } = redisSampleConfig;

  await client.set(core.ordersString.key, core.ordersString.value);
  await client.hSet(core.ordersHash.key, core.ordersHash.value);
  await client.rPush(core.ordersQueue.key, core.ordersQueue.value);

  await client.set(core.theme.key, core.theme.value);
  await client.set(
    core.dashboardCache.key,
    JSON.stringify(core.dashboardCache.value),
    { EX: core.dashboardCache.ttlSeconds }
  );
  await client.set(
    core.processedCounter.key,
    `${core.processedCounter.initial}`
  );
  await client.incrBy(
    core.processedCounter.key,
    core.processedCounter.incrementBy
  );
  await client.set(core.otp.key, core.otp.value, { EX: core.otp.ttlSeconds });

  for (const bit of core.bitmap.bits) {
    await client.sendCommand(['SETBIT', core.bitmap.key, `${bit}`, '1']);
  }

  const bitfieldArgs = ['BITFIELD', core.bitfield.key] as string[];
  for (const entry of core.bitfield.entries) {
    bitfieldArgs.push('SET', entry.type, `${entry.offset}`, `${entry.value}`);
  }
  await client.sendCommand(bitfieldArgs);
}

async function seedHashes(client: RedisClientType, counts: SeedCounts) {
  const { core } = redisSampleConfig;

  await client.hSet(core.customerHash.key, core.customerHash.value);
  await client.hSet(core.inventoryHash.key, core.inventoryHash.value);

  for (let index = 1; index <= counts.orderHashCount; index += 1) {
    const padded = `${index}`.padStart(4, '0');
    await client.hSet(`order:summary:${padded}`, {
      orderId: padded,
      status: index % 3 === 0 ? 'paid' : index % 2 === 0 ? 'draft' : 'queued',
      customer: `customer-${index}`,
      total: `${(index * 17.35).toFixed(2)}`,
      region: index % 2 === 0 ? 'apac' : 'emea',
    });
  }

  for (let index = 1; index <= counts.sessionHashCount; index += 1) {
    const padded = `${index}`.padStart(3, '0');
    await client.hSet(`session:user:${padded}`, {
      userId: padded,
      state: index % 2 === 0 ? 'active' : 'idle',
      ip: `10.0.0.${index}`,
      agent: index % 2 === 0 ? 'chrome' : 'safari',
    });
    await client.expire(`session:user:${padded}`, 900 + index);
  }
}

async function seedStrings(client: RedisClientType, counts: SeedCounts) {
  for (let index = 1; index <= counts.cachePageCount; index += 1) {
    const page = `${index}`.padStart(3, '0');
    await client.set(
      `cache:page:${page}`,
      JSON.stringify({
        id: page,
        section: index % 2 === 0 ? 'orders' : 'analytics',
        cached: true,
      }),
      { EX: 300 + index }
    );
  }
}

async function seedLists(client: RedisClientType) {
  const { core } = redisSampleConfig;

  await client.rPush(
    core.emailQueue.key,
    Array.from(
      { length: core.emailQueue.count },
      (_, index) => `${core.emailQueue.prefix}${index + 1}`
    )
  );
  await client.rPush(
    core.orderTimeline.key,
    Array.from(
      { length: core.orderTimeline.count },
      (_, index) => `${core.orderTimeline.prefix}${index + 1}`
    )
  );
}

async function seedSets(client: RedisClientType) {
  const { core } = redisSampleConfig;

  await client.sAdd(core.orderTags.key, core.orderTags.value);
  await client.sAdd(core.enabledFeatures.key, core.enabledFeatures.value);
  await client.sAdd(
    core.apacMembers.key,
    Array.from(
      { length: core.apacMembers.count },
      (_, index) => `${core.apacMembers.prefix}${index + 1}`
    )
  );
}

async function seedSortedSets(client: RedisClientType, counts: SeedCounts) {
  const { core } = redisSampleConfig;

  await client.zAdd(
    core.dailyLeaderboard.key,
    Array.from({ length: counts.leaderboardEntryCount }, (_, index) => ({
      value: `${core.dailyLeaderboard.memberPrefix}${index + 1}`,
      score:
        core.dailyLeaderboard.scoreStart +
        index * core.dailyLeaderboard.scoreStep,
    }))
  );

  await client.zAdd(
    core.recentOrders.key,
    Array.from({ length: core.recentOrders.count }, (_, index) => ({
      value: `${core.recentOrders.memberPrefix}${index + 1}`,
      score: core.recentOrders.scoreStart + index * core.recentOrders.scoreStep,
    }))
  );

  const geoAddArgs = ['GEOADD', core.warehousesGeo.key] as string[];
  for (const member of core.warehousesGeo.members) {
    geoAddArgs.push(`${member.longitude}`, `${member.latitude}`, member.member);
  }

  await client.sendCommand(geoAddArgs);
}

async function seedStreams(client: RedisClientType, counts: SeedCounts) {
  const { core } = redisSampleConfig;

  for (let index = 1; index <= counts.streamEntryCount; index += 1) {
    await client.sendCommand([
      'XADD',
      core.ordersStream.key,
      '*',
      'order_id',
      `${index}`,
      'status',
      index % 3 === 0 ? 'paid' : index % 2 === 0 ? 'queued' : 'draft',
      'source',
      index % 2 === 0 ? 'web' : 'api',
    ]);
  }

  for (let index = 1; index <= 40; index += 1) {
    await client.sendCommand([
      'XADD',
      core.auditStream.key,
      '*',
      'actor',
      `user-${index}`,
      'action',
      index % 2 === 0 ? 'update' : 'read',
      'resource',
      `order-${index}`,
    ]);
  }
}

export async function seedRedisSampleData(
  client: RedisClientType,
  counts: SeedCounts = defaultCounts
) {
  await client.flushDb();
  await seedCoreKeys(client);
  await seedStrings(client, counts);
  await seedHashes(client, counts);
  await seedLists(client);
  await seedSets(client);
  await seedSortedSets(client, counts);
  await seedStreams(client, counts);
}
