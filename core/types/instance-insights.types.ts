export interface SessionSummaryMetrics {
  total: number;
  active: number;
  idle: number;
  maxConnections: number;
  usagePercent: number;
  exceedsThreshold: boolean;
}

export interface TransactionSummaryMetrics {
  tps: number;
  commitsPerSec: number;
  rollbacksPerSec: number;
  totalCommits: number;
  totalRollbacks: number;
}

export interface TupleSummaryMetrics {
  insertsPerSec: number;
  updatesPerSec: number;
  deletesPerSec: number;
  fetchedPerSec: number;
  returnedPerSec: number;
  totalInserts: number;
  totalUpdates: number;
  totalDeletes: number;
  totalFetched: number;
  totalReturned: number;
}

export interface BlockIOSummaryMetrics {
  readsPerSec: number;
  hitsPerSec: number;
  totalReads: number;
  totalHits: number;
  bufferHitRatio: number;
}

export interface InstanceInsightsDashboard {
  capturedAt: string;
  intervalSeconds: number;
  version: string;
  sessions: SessionSummaryMetrics;
  transactions: TransactionSummaryMetrics;
  tuples: TupleSummaryMetrics;
  blockIO: BlockIOSummaryMetrics;
}

export interface InstanceSessionRow {
  pid: number;
  user: string;
  application: string | null;
  client: string | null;
  backendStart: string | null;
  transactionStart: string | null;
  state: string | null;
  waitEvent: string | null;
  blockingPids: number[];
  sql: string | null;
  queryStart: string | null;
  durationSeconds: number | null;
}

export interface InstanceLockRow {
  pid: number | null;
  lockType: string;
  targetRelation: string | null;
  mode: string;
  granted: boolean;
  state: string | null;
  user: string | null;
  sql: string | null;
}

export interface InstancePreparedTransactionRow {
  transaction: string;
  gid: string;
  prepared: string;
  owner: string;
  database: string;
}

export interface InstanceInsightsState {
  capturedAt: string;
  sessions: InstanceSessionRow[];
  locks: InstanceLockRow[];
  preparedTransactions: InstancePreparedTransactionRow[];
}

export interface InstanceConfigurationRow {
  name: string;
  category: string;
  value: string;
  unit: string | null;
  description: string;
  pendingRestart: boolean;
}

export interface InstanceInsightsConfiguration {
  capturedAt: string;
  total: number;
  rows: InstanceConfigurationRow[];
}

export interface ReplicationStatRow {
  pid: number;
  clientAddr: string | null;
  applicationName: string | null;
  state: string | null;
  syncState: string | null;
  replyTime: string | null;
  writeLag: string | null;
  flushLag: string | null;
  replayLag: string | null;
  sentLsn: string | null;
  writeLsn: string | null;
  flushLsn: string | null;
  replayLsn: string | null;
}

export interface ReplicationSlotRow {
  slotName: string;
  slotType: string;
  active: boolean;
  activePid: number | null;
  restartLsn: string | null;
  confirmedFlushLsn: string | null;
  retainedBytes: number;
  temporary: boolean;
}

export interface InstanceInsightsReplication {
  capturedAt: string;
  replicationStats: ReplicationStatRow[];
  replicationSlots: ReplicationSlotRow[];
  staleSlotWarning: string | null;
}

export interface InstanceActionResponse {
  success: boolean;
  message: string;
}

export type ReplicationSlotDesiredStatus = 'on' | 'off';
