import { describe, expect, it } from 'vitest';
import { getConnectionCapabilityProfile } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

describe('connection capabilities', () => {
  it('keeps Redis explorer visible and points Redis query flows to Raw Query', () => {
    const profile = getConnectionCapabilityProfile({
      type: DatabaseClientType.REDIS,
      method: EConnectionMethod.STRING,
    });

    expect(profile.visibleActivityItems).toContain('Explorer');
    expect(profile.supportsQueryFiles).toBe(true);
    expect(profile.primaryQuerySurface).toBe('raw-query');
  });

  it('routes MongoDB to the document Quick Query capability family', () => {
    const profile = getConnectionCapabilityProfile({
      type: DatabaseClientType.MONGODB,
      method: EConnectionMethod.STRING,
    });

    expect(profile.primaryQuerySurface).toBe('quick-query');
    expect(profile.supportsRawSql).toBe(false);
    expect(profile.supportsErd).toBe(false);
  });

  it('exposes MongoDB database and collection tab types', () => {
    const profile = getConnectionCapabilityProfile({
      type: DatabaseClientType.MONGODB,
    });

    expect(profile.allowedTabTypes).toContain(
      TabViewType.MongoDatabaseOverview
    );
    expect(profile.allowedTabTypes).toContain(
      TabViewType.MongoCollectionDetail
    );
    expect(profile.allowedTabTypes).not.toContain(TabViewType.TableOverview);
  });
});
