import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from 'redis';

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function parseInteger(value, fallback, minimum = 0) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  return parsed;
}

function encodeAuthSegment(value) {
  return value ? encodeURIComponent(value) : '';
}

function buildRedisUrl() {
  const host = readEnv('HERAQ_REDIS_HOST', 'REDIS_HOST') || '127.0.0.1';
  const port = parseInteger(readEnv('HERAQ_REDIS_PORT', 'REDIS_PORT'), 6379, 1);
  const database = parseInteger(
    readEnv('HERAQ_REDIS_DATABASE', 'REDIS_DATABASE'),
    0,
    0
  );
  const username = readEnv('HERAQ_REDIS_USERNAME', 'REDIS_USERNAME');
  const password = readEnv('HERAQ_REDIS_PASSWORD', 'REDIS_PASSWORD');
  const explicitUrl = readEnv('HERAQ_REDIS_URL', 'REDIS_URL');

  if (explicitUrl) {
    return explicitUrl;
  }

  const authUser = encodeAuthSegment(username);
  const authPassword = encodeAuthSegment(password);
  const auth =
    authUser || authPassword
      ? `${authUser}${authPassword ? `:${authPassword}` : ''}@`
      : '';

  return `redis://${auth}${host}:${port}/${database}`;
}

function buildCounts() {
  const sampleConfig = getRedisSampleConfig();

  return {
    ...sampleConfig.counts,
    cachePageCount: parseInteger(
      process.env.HERAQ_REDIS_SAMPLE_CACHE_PAGES,
      sampleConfig.counts.cachePageCount
    ),
    orderHashCount: parseInteger(
      process.env.HERAQ_REDIS_SAMPLE_ORDER_HASHES,
      sampleConfig.counts.orderHashCount
    ),
    sessionHashCount: parseInteger(
      process.env.HERAQ_REDIS_SAMPLE_SESSION_HASHES,
      sampleConfig.counts.sessionHashCount
    ),
    leaderboardEntryCount: parseInteger(
      process.env.HERAQ_REDIS_SAMPLE_LEADERBOARD_ENTRIES,
      sampleConfig.counts.leaderboardEntryCount
    ),
    streamEntryCount: parseInteger(
      process.env.HERAQ_REDIS_SAMPLE_STREAM_ENTRIES,
      sampleConfig.counts.streamEntryCount
    ),
  };
}

function getRedisSampleConfig() {
  return JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), 'data/redis-sample-data.json'),
      'utf8'
    )
  );
}

async function seedCoreKeys(client) {
  const { core } = getRedisSampleConfig();

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
  await client.set(core.otp.key, core.otp.value, {
    EX: core.otp.ttlSeconds,
  });

  for (const bit of core.bitmap.bits) {
    await client.sendCommand(['SETBIT', core.bitmap.key, `${bit}`, '1']);
  }

  const bitfieldArgs = ['BITFIELD', core.bitfield.key];
  for (const entry of core.bitfield.entries) {
    bitfieldArgs.push('SET', entry.type, `${entry.offset}`, `${entry.value}`);
  }
  await client.sendCommand(bitfieldArgs);
}

async function seedHashes(client, counts) {
  const { core } = getRedisSampleConfig();

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

async function seedStrings(client, counts) {
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

async function seedLists(client) {
  const { core } = getRedisSampleConfig();

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

async function seedSets(client) {
  const { core } = getRedisSampleConfig();

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

async function seedSortedSets(client, counts) {
  const { core } = getRedisSampleConfig();

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

  const geoAddArgs = ['GEOADD', core.warehousesGeo.key];
  for (const member of core.warehousesGeo.members) {
    geoAddArgs.push(`${member.longitude}`, `${member.latitude}`, member.member);
  }

  await client.sendCommand(geoAddArgs);
}

async function seedStreams(client, counts) {
  const { core } = getRedisSampleConfig();

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

export async function seedRedisSampleData(client) {
  const counts = buildCounts();

  await client.flushDb();
  await seedCoreKeys(client);
  await seedStrings(client, counts);
  await seedHashes(client, counts);
  await seedLists(client);
  await seedSets(client);
  await seedSortedSets(client, counts);
  await seedStreams(client, counts);

  const keyCount = await client.dbSize();

  return {
    keyCount,
    counts,
  };
}

async function main() {
  const client = createClient({ url: buildRedisUrl() });

  await client.connect();

  try {
    const summary = await seedRedisSampleData(client);
    console.log(
      `Redis sample data ready: ${summary.keyCount} keys seeded in DB ${readEnv('HERAQ_REDIS_DATABASE', 'REDIS_DATABASE') || '0'}.`
    );
  } finally {
    await client.quit();
  }
}

const currentFileUrl = import.meta.url;

if (process.argv[1] && pathToFileURL(process.argv[1]).href === currentFileUrl) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
