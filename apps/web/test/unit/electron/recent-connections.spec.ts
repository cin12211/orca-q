import { describe, expect, it } from 'vitest';
import { buildRecentConnectionTargets } from '~/electron/recent-connections';

describe('buildRecentConnectionTargets', () => {
  it('returns the most recently opened connections with labels resolved', () => {
    const recentConnections = buildRecentConnectionTargets(
      [
        { id: 'ws-1', name: 'Workspace A' },
        { id: 'ws-2', name: 'Workspace B' },
      ],
      [
        { id: 'conn-1', workspaceId: 'ws-1', name: 'Primary DB' },
        { id: 'conn-2', workspaceId: 'ws-2', name: 'Analytics DB' },
      ],
      [
        {
          id: 'ws-1',
          connectionId: 'conn-1',
          openedAt: '2026-04-20T08:00:00.000Z',
        },
        {
          id: 'ws-2',
          connectionId: 'conn-2',
          openedAt: '2026-04-21T08:00:00.000Z',
        },
      ]
    );

    expect(recentConnections).toEqual([
      {
        key: 'ws-2:conn-2',
        workspaceId: 'ws-2',
        workspaceName: 'Workspace B',
        connectionId: 'conn-2',
        connectionName: 'Analytics DB',
        openedAt: '2026-04-21T08:00:00.000Z',
      },
      {
        key: 'ws-1:conn-1',
        workspaceId: 'ws-1',
        workspaceName: 'Workspace A',
        connectionId: 'conn-1',
        connectionName: 'Primary DB',
        openedAt: '2026-04-20T08:00:00.000Z',
      },
    ]);
  });

  it('deduplicates repeated workspace state entries and skips missing records', () => {
    const recentConnections = buildRecentConnectionTargets(
      [{ id: 'ws-1', name: 'Workspace A' }],
      [{ id: 'conn-1', workspaceId: 'ws-1', name: 'Primary DB' }],
      [
        {
          id: 'ws-1',
          connectionId: 'conn-1',
          openedAt: '2026-04-21T09:00:00.000Z',
        },
        {
          id: 'ws-1',
          connectionId: 'conn-1',
          openedAt: '2026-04-20T09:00:00.000Z',
        },
        {
          id: 'ws-404',
          connectionId: 'conn-404',
          openedAt: '2026-04-22T09:00:00.000Z',
        },
      ]
    );

    expect(recentConnections).toHaveLength(1);
    expect(recentConnections[0]?.key).toBe('ws-1:conn-1');
    expect(recentConnections[0]?.openedAt).toBe('2026-04-21T09:00:00.000Z');
  });
});
