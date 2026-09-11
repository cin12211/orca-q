import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  MongoRawQueryOperation,
  MongoRawQueryRequest,
} from '~/core/types/mongodb-raw-query.types';

export interface MongoApprovalBinding {
  scriptHash: string;
  paramsHash: string;
  targetHash: string;
  database: string;
  manifestHash: string;
}

interface ChallengeRecord {
  binding: MongoApprovalBinding;
  expiresAt: number;
}

interface ApprovalRecord extends ChallengeRecord {
  token: string;
}

const stableJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      key =>
        `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`
    )
    .join(',')}}`;
};

const hash = (value: unknown) =>
  createHash('sha256').update(stableJson(value)).digest('hex');

export function createMongoApprovalBinding(
  request: MongoRawQueryRequest,
  operations: MongoRawQueryOperation[]
): MongoApprovalBinding {
  const { script, params, connectionId, database, ...target } = request;
  return {
    scriptHash: hash(script),
    paramsHash: hash(params ?? {}),
    targetHash: hash({ connectionId, target }),
    database: database ?? '',
    manifestHash: hash(
      operations.map(
        ({
          id,
          target: operationTarget,
          method,
          collection,
          dynamicTarget,
          risk,
        }) => ({
          id,
          target: operationTarget,
          method,
          collection,
          dynamicTarget,
          risk,
        })
      )
    ),
  };
}

const sameBinding = (left: MongoApprovalBinding, right: MongoApprovalBinding) =>
  stableJson(left) === stableJson(right);

export class MongoApprovalRegistry {
  private readonly challenges = new Map<string, ChallengeRecord>();
  private readonly approvals = new Map<string, ApprovalRecord>();
  private readonly now: () => number;
  private readonly ttlMs: number;

  constructor(options: { now?: () => number; ttlMs?: number } = {}) {
    this.now = options.now ?? (() => Date.now());
    this.ttlMs = options.ttlMs ?? 60_000;
  }

  createChallenge(binding: MongoApprovalBinding) {
    this.pruneExpired();
    const challengeId = randomUUID();
    const expiresAt = this.now() + this.ttlMs;
    this.challenges.set(challengeId, { binding, expiresAt });
    return { challengeId, expiresAt: new Date(expiresAt).toISOString() };
  }

  approveChallenge(challengeId: string) {
    this.pruneExpired();
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error('Approval challenge is missing or expired');
    this.challenges.delete(challengeId);
    const token = randomBytes(32).toString('base64url');
    this.approvals.set(token, { ...challenge, token });
    return {
      approvalToken: token,
      expiresAt: new Date(challenge.expiresAt).toISOString(),
    };
  }

  consumeApproval(token: string, binding: MongoApprovalBinding): boolean {
    this.pruneExpired();
    const approval = this.approvals.get(token);
    if (!approval || !sameBinding(approval.binding, binding)) return false;
    this.approvals.delete(token);
    return true;
  }

  pruneExpired() {
    const now = this.now();
    for (const [id, record] of this.challenges) {
      if (record.expiresAt <= now) this.challenges.delete(id);
    }
    for (const [token, record] of this.approvals) {
      if (record.expiresAt <= now) this.approvals.delete(token);
    }
  }
}

export const mongoApprovalRegistry = new MongoApprovalRegistry();
