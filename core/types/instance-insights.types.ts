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

export interface RedisOverviewMetrics {
  redisVersion: string;
  mode: string;
  uptimeSeconds: number;
  connectedClients: number;
  usedMemory: number;
  usedMemoryHuman: string;
  totalKeys: number;
  hitRate: number;
  opsPerSec: number;
  evictedKeys: number;
  expiredKeys: number;
  rejectedConnections: number;
}

export interface RedisPrefixMetric {
  prefix: string;
  keyCount: number;
  memoryBytes: number;
}

export interface RedisBigKeyMetric {
  key: string;
  type: string;
  ttl: number;
  memoryBytes: number;
}

export interface RedisMemoryInsight {
  usedMemory: number;
  usedMemoryHuman: string;
  usedMemoryPeak: number;
  usedMemoryPeakHuman: string;
  memoryFragmentationRatio: number;
  maxmemory: number;
  maxmemoryHuman: string;
  maxmemoryPolicy: string;
  topPrefixesByMemory: RedisPrefixMetric[];
  bigKeys: RedisBigKeyMetric[];
  warnings: string[];
}

export interface RedisSlowlogEntry {
  id: string;
  timestamp: string;
  durationMicros: number;
  command: string;
  clientAddr: string | null;
  clientName: string | null;
}

export interface RedisCommandStat {
  command: string;
  calls: number;
  usecPerCall: number;
}

export interface RedisClientSummary {
  id: string;
  addr: string;
  name: string;
  ageSeconds: number;
  idleSeconds: number;
  db: number;
  cmd: string;
  flags: string;
}

export interface RedisPerformanceInsight {
  instantaneousOpsPerSec: number;
  totalCommandsProcessed: number;
  latencyDoctor: string | null;
  slowlog: RedisSlowlogEntry[];
  commandStats: RedisCommandStat[];
  blockedClients: number;
  longRunningLuaScripts: RedisClientSummary[];
}

export interface RedisKeyspaceDbInsight {
  database: string;
  keyCount: number;
  expires: number;
  avgTtl: number;
}

export interface RedisKeyTypeDistribution {
  type: string;
  count: number;
}

export interface RedisKeyspaceInsight {
  databases: RedisKeyspaceDbInsight[];
  expiredKeyCount: number;
  avgTtl: number;
  keyTypeDistribution: RedisKeyTypeDistribution[];
  topPrefixes: Array<Pick<RedisPrefixMetric, 'prefix' | 'keyCount'>>;
  keysWithoutTtl: number;
  hotKeysNote: string;
  sampledKeys: number;
}

export interface RedisClientWarning {
  clientId: string;
  reason: string;
}

export interface RedisClientInsight {
  connectedClients: number;
  clients: RedisClientSummary[];
  suspiciousClients: RedisClientWarning[];
}

export interface RedisPersistenceInsight {
  rdbEnabled: boolean;
  lastSaveStatus: string | null;
  lastSaveTime: string | null;
  aofEnabled: boolean;
  aofRewriteInProgress: boolean;
  aofLastRewriteStatus: string | null;
  lastBgsaveError: string | null;
  changesSinceLastSave: number;
  warnings: string[];
}

export interface RedisReplicaSummary {
  id: string;
  addr: string;
  state: string;
  lag: number | null;
  offset: string | null;
}

export interface RedisReplicationInsight {
  role: string;
  connectedReplicas: number;
  replicas: RedisReplicaSummary[];
  replicationLag: number | null;
  masterLinkStatus: string | null;
  sentinelMasters: number | null;
  clusterEnabled: boolean;
  clusterState: string | null;
  clusterSlotsAssigned: number | null;
  clusterKnownNodes: number | null;
}

export interface RedisConfigEntry {
  name: string;
  value: string;
}

export interface RedisInstanceInsights {
  capturedAt: string;
  databaseIndex: number;
  overview: RedisOverviewMetrics;
  memory: RedisMemoryInsight;
  performance: RedisPerformanceInsight;
  keyspace: RedisKeyspaceInsight;
  clients: RedisClientInsight;
  persistence: RedisPersistenceInsight;
  replication: RedisReplicationInsight;
  config: RedisConfigEntry[];
}
