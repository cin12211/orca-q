import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { mongoRawQueryBody } from '../support/mongo-connection';

describe('MongoDB Raw Query', async () => {
  await setup();

  it('streams cursor rows as NDJSON', async () => {
    const response = await $fetch<string>('/api/mongodb/raw-query-stream', {
      method: 'POST',
      body: mongoRawQueryBody({
        script:
          "return db.collection('users').find({ active: true }).sort({ name: 1 })",
      }),
      responseType: 'text',
    });
    const messages = response
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    expect(messages.some(message => message.type === 'meta')).toBe(true);
    expect(
      messages
        .flatMap(message => (message.type === 'rows' ? message.data : []))
        .map((row: any) => row.name)
    ).toEqual(['Alice', 'Bob']);
    expect(messages.at(-1)).toMatchObject({ type: 'done', truncated: false });
  });
});
