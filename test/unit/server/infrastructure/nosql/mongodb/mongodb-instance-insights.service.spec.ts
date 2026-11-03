import { describe, expect, it } from 'vitest';
import {
  collectMongoOverview,
  collectMongoReplication,
  describeMongoCommandError,
  mapReplicaMembers,
} from '~/server/infrastructure/nosql/mongodb/mongodb-instance-insights.service';

const unauthorized = Object.assign(new Error('not authorized'), {
  codeName: 'Unauthorized',
  code: 13,
});

function adminWith(responses: Record<string, unknown>) {
  return {
    command: async (command: Record<string, unknown>) => {
      const name = Object.keys(command)[0];
      const response = responses[name];
      if (response instanceof Error) throw response;
      if (response === undefined) throw new Error(`unexpected ${name}`);
      return response as Record<string, unknown>;
    },
  };
}

describe('describeMongoCommandError', () => {
  it('hints at clusterMonitor on Unauthorized', () => {
    expect(describeMongoCommandError(unauthorized, 'serverStatus')).toContain(
      'clusterMonitor'
    );
  });

  it('falls back to the error message', () => {
    expect(describeMongoCommandError(new Error('boom'), 'hello')).toBe('boom');
  });
});

describe('collectMongoOverview', () => {
  it('maps serverStatus fields', async () => {
    const overview = await collectMongoOverview(
      adminWith({
        buildInfo: { version: '7.0.1' },
        serverStatus: {
          version: '7.0.2',
          host: 'db:27017',
          process: 'mongod',
          uptime: 120,
          storageEngine: { name: 'wiredTiger' },
          connections: { current: 3, available: 97, totalCreated: 10 },
          opcounters: {
            insert: 1,
            query: 2,
            update: 3,
            delete: 4,
            getmore: 5,
            command: 6,
          },
          mem: { resident: 64, virtual: 1024 },
          network: { bytesIn: 100, bytesOut: 200, numRequests: 7 },
        },
      })
    );

    expect(overview).toMatchObject({
      version: '7.0.2',
      host: 'db:27017',
      storageEngine: 'wiredTiger',
      uptimeSeconds: 120,
      connections: { current: 3, available: 97, totalCreated: 10 },
      opcounters: { query: 2, command: 6 },
      memory: { residentMb: 64, virtualMb: 1024 },
      serverStatusError: null,
    });
  });

  it('keeps the buildInfo version when serverStatus is not permitted', async () => {
    const overview = await collectMongoOverview(
      adminWith({ buildInfo: { version: '6.0.0' }, serverStatus: unauthorized })
    );

    expect(overview.version).toBe('6.0.0');
    expect(overview.connections).toBeNull();
    expect(overview.opcounters).toBeNull();
    expect(overview.serverStatusError).toContain('clusterMonitor');
  });
});

describe('collectMongoReplication', () => {
  it('reports standalone without calling replSetGetStatus', async () => {
    const replication = await collectMongoReplication(
      adminWith({ hello: { isWritablePrimary: true } })
    );

    expect(replication).toMatchObject({
      topology: 'standalone',
      role: 'standalone',
      members: [],
      membersError: null,
    });
  });

  it('reports mongos as sharded', async () => {
    const replication = await collectMongoReplication(
      adminWith({ hello: { msg: 'isdbgrid' } })
    );

    expect(replication.topology).toBe('sharded');
    expect(replication.role).toBe('mongos');
  });

  it('keeps hello data when replSetGetStatus is not permitted', async () => {
    const replication = await collectMongoReplication(
      adminWith({
        hello: {
          setName: 'rs0',
          secondary: true,
          primary: 'a:27017',
          me: 'b:27017',
          hosts: ['a:27017', 'b:27017'],
        },
        replSetGetStatus: unauthorized,
      })
    );

    expect(replication).toMatchObject({
      topology: 'replicaSet',
      role: 'secondary',
      setName: 'rs0',
      hosts: ['a:27017', 'b:27017'],
      members: [],
    });
    expect(replication.membersError).toContain('clusterMonitor');
  });
});

describe('mapReplicaMembers', () => {
  it('computes lag against the primary optime', () => {
    const primaryOptime = new Date('2026-01-01T00:00:10Z');
    const members = mapReplicaMembers({
      members: [
        {
          name: 'a:27017',
          stateStr: 'PRIMARY',
          health: 1,
          optimeDate: primaryOptime,
          self: true,
        },
        {
          name: 'b:27017',
          stateStr: 'SECONDARY',
          health: 1,
          optimeDate: new Date('2026-01-01T00:00:07Z'),
          pingMs: 2,
        },
        { name: 'c:27017', stateStr: 'ARBITER', health: 1 },
      ],
    });

    expect(members.map(member => member.lagSeconds)).toEqual([0, 3, null]);
    expect(members[0].self).toBe(true);
    expect(members[1].pingMs).toBe(2);
  });
});
