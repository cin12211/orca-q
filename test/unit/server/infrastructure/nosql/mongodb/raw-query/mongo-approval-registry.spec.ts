import { describe, expect, it } from 'vitest';
import {
  MongoApprovalRegistry,
  createMongoApprovalBinding,
} from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry';

const fixtureRequest = {
  connectionId: 'connection-1',
  database: 'orcaq_fixture',
  dbConnectionString: 'mongodb://user:password@localhost:27017/orcaq_fixture',
  script: `return db.collection('users').updateMany({}, { $set: { active: true } })`,
  params: { id: { $oid: '507f1f77bcf86cd799439011' } },
} as any;
const fixtureOperations = [
  {
    id: 'collection:updateMany:users',
    target: 'collection' as const,
    collection: 'users',
    method: 'updateMany',
    dynamicTarget: false,
    risk: 'write' as const,
    summary: 'update users',
  },
];

describe('Mongo approval registry', () => {
  it('consumes an approval token exactly once', () => {
    const registry = new MongoApprovalRegistry({
      now: () => 1_000,
      ttlMs: 60_000,
    });
    const binding = createMongoApprovalBinding(
      fixtureRequest,
      fixtureOperations
    );
    const challenge = registry.createChallenge(binding);
    const approval = registry.approveChallenge(challenge.challengeId);

    expect(registry.consumeApproval(approval.approvalToken, binding)).toBe(
      true
    );
    expect(registry.consumeApproval(approval.approvalToken, binding)).toBe(
      false
    );
  });

  it('rejects a token when script or parameters change', () => {
    const registry = new MongoApprovalRegistry({
      now: () => 1_000,
      ttlMs: 60_000,
    });
    const binding = createMongoApprovalBinding(
      fixtureRequest,
      fixtureOperations
    );
    const challenge = registry.createChallenge(binding);
    const approval = registry.approveChallenge(challenge.challengeId);

    expect(
      registry.consumeApproval(approval.approvalToken, {
        ...binding,
        scriptHash: 'different',
      })
    ).toBe(false);
  });

  it('expires challenges and approvals', () => {
    let now = 1_000;
    const registry = new MongoApprovalRegistry({ now: () => now, ttlMs: 10 });
    const binding = createMongoApprovalBinding(
      fixtureRequest,
      fixtureOperations
    );
    const challenge = registry.createChallenge(binding);
    now = 1_011;

    expect(() => registry.approveChallenge(challenge.challengeId)).toThrow(
      'expired'
    );
  });
});
