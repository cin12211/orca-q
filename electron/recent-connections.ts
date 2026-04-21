export interface RecentConnectionWorkspace {
  id: string;
  name: string;
}

export interface RecentConnectionRecord {
  id: string;
  workspaceId: string;
  name: string;
}

export interface RecentWorkspaceStateRecord {
  id: string;
  connectionId?: string;
  openedAt?: string;
  updatedAt?: string;
}

export interface RecentConnectionTarget {
  key: string;
  workspaceId: string;
  workspaceName: string;
  connectionId: string;
  connectionName: string;
  openedAt: string | null;
}

function toTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function buildRecentConnectionTargets(
  workspaces: RecentConnectionWorkspace[],
  connections: RecentConnectionRecord[],
  workspaceStates: RecentWorkspaceStateRecord[],
  limit = 10
): RecentConnectionTarget[] {
  const workspaceById = new Map(
    workspaces.map(workspace => [workspace.id, workspace])
  );
  const connectionByKey = new Map(
    connections.map(connection => [
      `${connection.workspaceId}:${connection.id}`,
      connection,
    ])
  );

  const sortedStates = [...workspaceStates].sort((left, right) => {
    const rightTimestamp = Math.max(
      toTimestamp(right.openedAt),
      toTimestamp(right.updatedAt)
    );
    const leftTimestamp = Math.max(
      toTimestamp(left.openedAt),
      toTimestamp(left.updatedAt)
    );

    return rightTimestamp - leftTimestamp;
  });

  const recentConnections: RecentConnectionTarget[] = [];
  const seenKeys = new Set<string>();

  for (const state of sortedStates) {
    if (!state.connectionId) {
      continue;
    }

    const key = `${state.id}:${state.connectionId}`;

    if (seenKeys.has(key)) {
      continue;
    }

    const workspace = workspaceById.get(state.id);
    const connection = connectionByKey.get(key);

    if (!workspace || !connection) {
      continue;
    }

    seenKeys.add(key);
    recentConnections.push({
      key,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      connectionId: connection.id,
      connectionName: connection.name,
      openedAt: state.openedAt ?? state.updatedAt ?? null,
    });

    if (recentConnections.length >= limit) {
      break;
    }
  }

  console.log(
    '🚀 ~ buildRecentConnectionTargets ~ recentConnections:',
    recentConnections
  );

  return recentConnections;
}
