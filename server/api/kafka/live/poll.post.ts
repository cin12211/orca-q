import { readBody } from 'h3';
import { z } from 'zod';
import { pollKafkaLive } from '~/server/infrastructure/nosql/kafka/kafka-live.service';

const bodySchema = z.object({
  sessionId: z.string().min(1),
  afterSequence: z.number().int().min(0).optional(),
});

export default defineEventHandler(async event => {
  const body = bodySchema.parse(await readBody(event));
  return pollKafkaLive(body.sessionId, body.afterSequence);
});
