import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceInsightsSection,
  InstanceInsightsView,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import { trySafeQuery } from '../shared/safe-query';
import {
  createActionCapability,
  createInsightsCapabilities,
  createTable,
  createUnavailableSection,
  formatDateTime,
  formatNumber,
  formatValue,
} from '../shared/view-helpers';
import type { InstanceInsightsAdapterParams } from '../types';

const ROW_LIMIT = 200;

/**
 * Read-only Instance Insights for CockroachDB: cluster overview, sessions and
 * running statements, and settings. Cancel/kill actions are intentionally not
 * offered.
 */
export class CockroachInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.COCKROACHDB;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<CockroachInstanceInsightsAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.COCKROACHDB,
    });

    return new CockroachInstanceInsightsAdapter(adapter);
  }

  override async getView(): Promise<InstanceInsightsView> {
    const capturedAt = new Date().toISOString();
    const [overview, sessions, configuration] = await Promise.all([
      this.buildOverviewSection(capturedAt),
      this.buildSessionsSection(capturedAt),
      this.buildConfigurationSection(capturedAt),
    ]);

    const version = overview.cards?.find(card => card.id === 'version')?.value;
    const databaseName = overview.details?.find(
      detail => detail.label === 'Database'
    )?.value;

    return {
      dbType: this.dbType,
      title: 'Instance Insights',
      databaseName: databaseName && databaseName !== '-' ? databaseName : null,
      version: version && version !== '-' ? version : null,
      capturedAt,
      capabilities: createInsightsCapabilities({
        supportsSessionInspection: true,
        supportsConfiguration: true,
      }),
      actions: [
        createActionCapability({
          id: 'cancel-query',
          label: 'Cancel Query',
          state: 'unsupported',
          description: 'Instance Insights is read-only for CockroachDB.',
        }),
      ],
      sections: [overview, sessions, configuration],
    };
  }

  private async buildOverviewSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'Cluster version, nodes, and databases';
    const [infoResult, nodesResult, databasesResult] = await Promise.all([
      trySafeQuery<Record<string, unknown>>(
        this.adapter,
        `SELECT
          version() AS full_version,
          crdb_internal.cluster_id()::STRING AS cluster_id,
          current_database() AS database_name,
          current_user AS current_user`
      ),
      trySafeQuery<Record<string, unknown>>(
        this.adapter,
        `SELECT node_id, address, locality, is_live, started_at
         FROM crdb_internal.gossip_nodes
         ORDER BY node_id`
      ),
      trySafeQuery<{ total: string | number }>(
        this.adapter,
        `SELECT count(*) AS total FROM [SHOW DATABASES]`
      ),
    ]);

    const info = infoResult.rows[0];

    if (infoResult.error || !info) {
      return createUnavailableSection(
        'overview',
        'Overview',
        subtitle,
        infoResult.error || 'No cluster details were returned.',
        capturedAt
      );
    }

    const fullVersion = String(info.full_version ?? '');
    const shortVersion = /v\d+\.\d+(\.\d+)?/.exec(fullVersion)?.[0] ?? '-';
    const liveNodes = nodesResult.rows.filter(row => row.is_live === true);

    return {
      id: 'overview',
      title: 'Overview',
      subtitle,
      status: 'ready',
      capturedAt,
      statusMessage: nodesResult.error,
      cards: [
        { id: 'version', label: 'Version', value: shortVersion },
        {
          id: 'nodes',
          label: 'Live Nodes',
          value: nodesResult.error
            ? '-'
            : `${formatNumber(liveNodes.length)} / ${formatNumber(nodesResult.rows.length)}`,
        },
        {
          id: 'databases',
          label: 'Databases',
          value: formatNumber(databasesResult.rows[0]?.total),
        },
      ],
      details: [
        { label: 'Database', value: formatValue(info.database_name) },
        { label: 'Current User', value: formatValue(info.current_user) },
        { label: 'Cluster ID', value: formatValue(info.cluster_id) },
        { label: 'Build', value: formatValue(fullVersion) },
      ],
      tables: nodesResult.error
        ? []
        : [
            createTable({
              id: 'cockroach-nodes',
              title: 'Nodes',
              emptyMessage: 'No nodes were returned.',
              rows: nodesResult.rows.map(row => ({
                ...row,
                started_at: formatDateTime(row.started_at),
              })),
            }),
          ],
    };
  }

  private async buildSessionsSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'Open sessions and running statements across the cluster';
    const [sessionsResult, queriesResult] = await Promise.all([
      trySafeQuery<Record<string, unknown>>(
        this.adapter,
        `SELECT
          session_id,
          node_id,
          user_name,
          client_address,
          application_name,
          status,
          session_start,
          active_query_start
         FROM [SHOW CLUSTER SESSIONS]
         ORDER BY session_start
         LIMIT ${ROW_LIMIT}`
      ),
      trySafeQuery<Record<string, unknown>>(
        this.adapter,
        `SELECT
          query_id,
          node_id,
          user_name,
          application_name,
          phase,
          start,
          query
         FROM [SHOW CLUSTER STATEMENTS]
         ORDER BY start
         LIMIT ${ROW_LIMIT}`
      ),
    ]);

    if (sessionsResult.error && queriesResult.error) {
      return createUnavailableSection(
        'sessions-locks',
        'Sessions',
        subtitle,
        sessionsResult.error,
        capturedAt
      );
    }

    return {
      id: 'sessions-locks',
      title: 'Sessions',
      subtitle,
      status: 'ready',
      capturedAt,
      statusMessage: sessionsResult.error || queriesResult.error,
      cards: [
        {
          id: 'session-count',
          label: 'Visible Sessions',
          value: formatNumber(sessionsResult.rows.length),
        },
        {
          id: 'statement-count',
          label: 'Running Statements',
          value: formatNumber(queriesResult.rows.length),
        },
      ],
      tables: [
        createTable({
          id: 'cockroach-sessions',
          title: 'Sessions',
          emptyMessage: 'No sessions were returned.',
          rows: sessionsResult.rows,
        }),
        createTable({
          id: 'cockroach-statements',
          title: 'Running Statements',
          emptyMessage: 'No statements are running.',
          rows: queriesResult.rows,
        }),
      ],
    };
  }

  private async buildConfigurationSection(
    capturedAt: string
  ): Promise<InstanceInsightsSection> {
    const subtitle = 'Session settings for this connection';
    const result = await trySafeQuery<Record<string, unknown>>(
      this.adapter,
      `SELECT variable AS name, value FROM [SHOW ALL] ORDER BY variable`
    );

    if (result.error) {
      return createUnavailableSection(
        'configuration',
        'Configuration',
        subtitle,
        result.error,
        capturedAt
      );
    }

    return {
      id: 'configuration',
      title: 'Configuration',
      subtitle,
      status: 'ready',
      capturedAt,
      searchable: true,
      searchPlaceholder: 'Search setting name...',
      cards: [
        {
          id: 'setting-count',
          label: 'Settings',
          value: formatNumber(result.rows.length),
        },
      ],
      tables: [
        createTable({
          id: 'cockroach-settings',
          title: 'Session Settings',
          emptyMessage: 'No settings were returned.',
          rows: result.rows,
        }),
      ],
    };
  }
}
