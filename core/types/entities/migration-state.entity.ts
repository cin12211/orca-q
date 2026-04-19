/**
 * Single-record entity that tracks which IDB migrations have been applied.
 * id is always 'applied-migrations'.
 */
export interface MigrationState {
  id: 'applied-migrations';
  /** Sorted list of migration names applied at the time this record was written. */
  names: string[];
}
