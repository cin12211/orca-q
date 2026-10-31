// Seeds the RabbitMQ fixture through the Management HTTP API (no AMQP client
// needed): a vhost, exchanges of each type, queues with DLX/TTL arguments,
// a backlog queue with no consumer, JSON and binary messages, and a user that
// only has the `management` tag.

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

const host = readEnv('ORCAQ_RABBITMQ_HOST', 'RABBITMQ_HOST') || '127.0.0.1';
const port =
  readEnv('ORCAQ_RABBITMQ_MANAGEMENT_PORT', 'RABBITMQ_MANAGEMENT_PORT') ||
  '15672';
const user = readEnv('ORCAQ_RABBITMQ_USER', 'RABBITMQ_USER') || 'orcaq';
const password =
  readEnv('ORCAQ_RABBITMQ_PASSWORD', 'RABBITMQ_PASSWORD') || 'orcaq';
const vhost = readEnv('ORCAQ_RABBITMQ_VHOST') || 'orcaq';

const baseUrl = `http://${host}:${port}/api`;
const authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const v = encodeURIComponent(vhost);

async function api(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { authorization, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `${method} ${path} -> ${response.status} ${await response.text()}`
    );
  }

  return response.status === 204 ? null : response.json().catch(() => null);
}

async function waitForApi() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/overview`, {
        headers: { authorization },
      });
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('RabbitMQ Management API did not become ready.');
}

await waitForApi();

await api('PUT', `/vhosts/${v}`, {});
await api('PUT', `/permissions/${v}/${encodeURIComponent(user)}`, {
  configure: '.*',
  write: '.*',
  read: '.*',
});
await api('PUT', '/users/orcaq_viewer', {
  password: 'orcaq_viewer',
  tags: 'management',
});
await api('PUT', `/permissions/${v}/orcaq_viewer`, {
  configure: '',
  write: '',
  read: '.*',
});

// Policies and limits for the Instance Insights tabs.
await api('PUT', `/policies/${v}/orders-max-length`, {
  pattern: '^orders\\.',
  'apply-to': 'queues',
  priority: 1,
  definition: { 'max-length': 100000 },
});
await api('PUT', `/operator-policies/${v}/cap-length`, {
  pattern: '.*',
  'apply-to': 'queues',
  priority: 0,
  definition: { 'max-length': 1000000 },
});
await api('PUT', `/vhost-limits/${v}/max-connections`, { value: 500 });
await api('PUT', '/user-limits/orcaq_viewer/max-channels', { value: 50 });

const exchanges = [
  ['orders.direct', 'direct'],
  ['events.topic', 'topic'],
  ['broadcast.fanout', 'fanout'],
  ['orders.dlx', 'fanout'],
];

for (const [name, type] of exchanges) {
  await api('PUT', `/exchanges/${v}/${encodeURIComponent(name)}`, {
    type,
    durable: true,
  });
}

const queues = [
  [
    'orders.created',
    { 'x-dead-letter-exchange': 'orders.dlx', 'x-message-ttl': 86400000 },
    'classic',
  ],
  ['orders.dead-letter', {}, 'classic'],
  ['events.audit', {}, 'quorum'],
  ['backlog.no-consumer', { 'x-max-length': 10000 }, 'classic'],
];

for (const [name, args, type] of queues) {
  await api('PUT', `/queues/${v}/${encodeURIComponent(name)}`, {
    durable: true,
    arguments: { ...args, 'x-queue-type': type },
  });
}

const bindings = [
  ['orders.direct', 'orders.created', 'order.created'],
  ['orders.dlx', 'orders.dead-letter', ''],
  ['events.topic', 'events.audit', 'audit.#'],
  ['broadcast.fanout', 'backlog.no-consumer', ''],
];

for (const [source, queue, routingKey] of bindings) {
  await api(
    'POST',
    `/bindings/${v}/e/${encodeURIComponent(source)}/q/${encodeURIComponent(queue)}`,
    { routing_key: routingKey, arguments: {} }
  );
}

// A topic permission so the Users & Permissions view has something to show.
await api('PUT', `/topic-permissions/${v}/orcaq_viewer`, {
  exchange: 'events.topic',
  write: '',
  read: '^audit\\..*',
});

async function publish(exchange, routingKey, payload, extra = {}) {
  await api('POST', `/exchanges/${v}/${encodeURIComponent(exchange)}/publish`, {
    properties: {
      content_type: 'application/json',
      headers: { source: 'fixture' },
    },
    routing_key: routingKey,
    payload,
    payload_encoding: 'string',
    ...extra,
  });
}

// Reset queue contents so re-seeding gives stable counts.
for (const [name] of queues) {
  await api('DELETE', `/queues/${v}/${encodeURIComponent(name)}/contents`);
}

for (let index = 1; index <= 5; index++) {
  await publish(
    'orders.direct',
    'order.created',
    JSON.stringify({ orderId: index, amount: index * 10, status: 'created' })
  );
}

for (let index = 1; index <= 3; index++) {
  await publish(
    'events.topic',
    'audit.user.login',
    JSON.stringify({ event: 'login', userId: `u-${index}` })
  );
}

for (let index = 1; index <= 25; index++) {
  await publish('broadcast.fanout', '', `plain text message ${index}`);
}

await publish(
  'broadcast.fanout',
  '',
  Buffer.from([0, 1, 2, 250, 251, 252]).toString('base64'),
  {
    payload_encoding: 'base64',
    properties: { content_type: 'application/octet-stream' },
  }
);

console.log(`Seeded RabbitMQ vhost "${vhost}" at ${host}:${port}`);
