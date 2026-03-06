export interface BlockIOMetrics {
  blks_read: number;
  blks_hit: number;
}

export interface DatabaseMetrics {
  sessions: number;
  tps: number;
  block_io: BlockIOMetrics;
}
