import { readBody } from 'h3';
import { z } from 'zod';
import { stopKafkaLive } from '~/server/infrastructure/nosql/kafka/kafka-live.service';

const bodySchema = z.object({ sessionId: z.string().min(1) });

export default defineEventHandler(async event => {
  const body = bodySchema.parse(await readBody(event));
  return stopKafkaLive(body.sessionId);
});
