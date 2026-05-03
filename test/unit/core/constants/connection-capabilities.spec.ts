import { describe, expect, it } from 'vitest';
import { getConnectionCapabilityProfile } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

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
});
