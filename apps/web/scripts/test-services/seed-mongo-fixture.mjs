import { MongoClient } from 'mongodb';

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

const host = readEnv('ORCAQ_MONGODB_HOST', 'MONGODB_HOST') || '127.0.0.1';
const port = readEnv('ORCAQ_MONGODB_PORT', 'MONGODB_PORT') || '27017';
const database =
  readEnv('ORCAQ_MONGODB_DATABASE', 'MONGODB_DATABASE') || 'orcaq_fixture';

const url = `mongodb://${host}:${port}`;

const USERS = [
  { name: 'Alice', email: 'alice@example.com', age: 30, active: true },
  { name: 'Bob', email: 'bob@example.com', age: 25, active: true },
  { name: 'Carol', email: 'carol@example.com', age: 35, active: false },
];

const ORDERS = [
  { customer: 'Alice', amount: 100, status: 'paid' },
  { customer: 'Bob', amount: 50, status: 'pending' },
];

async function seed() {
  const client = new MongoClient(url, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });

  try {
    await client.connect();
    const db = client.db(database);

    await db
      .collection('users')
      .drop()
      .catch(() => {});
    await db
      .collection('orders')
      .drop()
      .catch(() => {});

    await db.collection('users').insertMany(USERS);
    await db.collection('orders').insertMany(ORDERS);

    console.log(
      `Seeded MongoDB fixture database "${database}" with ${USERS.length} users and ${ORDERS.length} orders`
    );
  } finally {
    await client.close();
  }
}

seed().catch(error => {
  console.error('Failed to seed MongoDB fixture:', error);
  process.exit(1);
});
