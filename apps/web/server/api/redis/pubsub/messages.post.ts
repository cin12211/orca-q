import { readBody } from 'h3';
import { getRedisPubSubMessages } from '~/server/infrastructure/nosql/redis/redis-pubsub.service';

export default defineEventHandler(async event => {
  const body: {
    sessionId?: string | null;
  } = await readBody(event);

  return getRedisPubSubMessages(body.sessionId);
});
