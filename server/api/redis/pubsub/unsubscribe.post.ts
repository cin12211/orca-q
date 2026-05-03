import { readBody } from 'h3';
import { unsubscribeRedisPubSubTarget } from '~/server/infrastructure/nosql/redis/redis-pubsub.service';

export default defineEventHandler(async event => {
  const body: {
    sessionId?: string | null;
    target?: string | null;
  } = await readBody(event);

  return unsubscribeRedisPubSubTarget(body.sessionId, body.target);
});
