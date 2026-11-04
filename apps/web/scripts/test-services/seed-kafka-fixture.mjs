// Seeds the Kafka fixture: a 3-partition JSON topic with keys and headers, a
// binary topic, and a consumer group that has committed only part of the
// topic so it shows lag.
import {
  Admin,
  Consumer,
  Producer,
  stringSerializers,
} from '@platformatic/kafka';

const host = process.env.ORCAQ_KAFKA_HOST?.trim() || '127.0.0.1';
const port = process.env.ORCAQ_KAFKA_PORT?.trim() || '9092';
const base = {
  clientId: 'orcaq-fixture-seed',
  bootstrapBrokers: [`${host}:${port}`],
  retries: 10,
};

const ORDERS_TOPIC = 'orcaq.orders';
const BINARY_TOPIC = 'orcaq.binary';
const GROUP_ID = 'orcaq-fixture-group';

async function waitForBroker() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const admin = new Admin({ ...base, retries: 0 });
    try {
      await admin.metadata({ topics: [] });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      await admin.close().catch(() => undefined);
    }
  }

  throw new Error('Kafka fixture did not become ready.');
}

await waitForBroker();

const admin = new Admin(base);
const existing = await admin.listTopics();
const toDelete = [ORDERS_TOPIC, BINARY_TOPIC].filter(name =>
  existing.includes(name)
);

if (toDelete.length) {
  await admin.deleteTopics({ topics: toDelete });
  await new Promise(resolve => setTimeout(resolve, 2000));
}

await admin.createTopics({
  topics: [ORDERS_TOPIC],
  partitions: 3,
  replicas: 1,
});
await admin.createTopics({
  topics: [BINARY_TOPIC],
  partitions: 1,
  replicas: 1,
});

const producer = new Producer({ ...base, serializers: stringSerializers });

for (let index = 0; index < 30; index++) {
  await producer.send({
    messages: [
      {
        topic: ORDERS_TOPIC,
        key: `order-${index}`,
        value: JSON.stringify({
          orderId: index,
          amount: index * 5,
          status: 'created',
        }),
        headers: { source: 'fixture', 'trace-id': `t-${index}` },
        partition: index % 3,
      },
    ],
  });
}

await producer.close();

const rawProducer = new Producer(base);
await rawProducer.send({
  messages: [
    { topic: BINARY_TOPIC, value: Buffer.from([0, 1, 2, 250, 251, 252]) },
  ],
});
await rawProducer.close();

await admin.deleteGroups({ groups: [GROUP_ID] }).catch(() => undefined);
// Commit offset 4 on every partition: 10 - 4 = 6 lag each, 18 in total.
const consumer = new Consumer({ ...base, groupId: GROUP_ID });
await consumer.joinGroup({});
await consumer.commit({
  offsets: [0, 1, 2].map(partition => ({
    topic: ORDERS_TOPIC,
    partition,
    offset: 4n,
    leaderEpoch: 0,
  })),
});
await consumer.leaveGroup().catch(() => undefined);
await consumer.close();
await admin.close();

console.log(`Seeded Kafka fixture at ${host}:${port}`);
