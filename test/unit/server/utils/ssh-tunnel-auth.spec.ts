import { describe, expect, it } from 'vitest';
import {
  ESSHAuthMethod,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { buildAuthConfig } from '~/server/utils/ssh-tunnel';

const base: ISSHConfig = {
  enabled: true,
  host: 'bastion',
  port: 22,
  username: 'tunnel',
};

describe('buildAuthConfig (SSH auth method mapping)', () => {
  it('password auth sends only the password, never a private key', () => {
    const cfg = buildAuthConfig({
      ...base,
      authMethod: ESSHAuthMethod.PASSWORD,
      password: 'pw',
      privateKey: '', // form default — must not be forwarded
    });

    expect(cfg).toEqual({ password: 'pw' });
    expect(cfg).not.toHaveProperty('privateKey');
  });

  it('key auth sends the private key', () => {
    const cfg = buildAuthConfig({
      ...base,
      authMethod: ESSHAuthMethod.KEY,
      privateKey: 'PEM',
    });

    expect(cfg.privateKey).toBe('PEM');
    expect(cfg).not.toHaveProperty('password');
  });

  it('key auth forwards the password as a passphrase for encrypted keys', () => {
    const cfg = buildAuthConfig({
      ...base,
      authMethod: ESSHAuthMethod.KEY,
      privateKey: 'PEM',
      password: 'passphrase',
    });

    expect(cfg).toEqual({ privateKey: 'PEM', passphrase: 'passphrase' });
  });

  it('key auth without a private key throws a clear error', () => {
    expect(() =>
      buildAuthConfig({ ...base, authMethod: ESSHAuthMethod.KEY })
    ).toThrow(/private key/i);
  });

  it('falls back to useSshKey when authMethod is absent', () => {
    expect(
      buildAuthConfig({ ...base, useSshKey: true, privateKey: 'PEM' })
    ).toEqual({ privateKey: 'PEM' });
    expect(
      buildAuthConfig({ ...base, useSshKey: false, password: 'pw' })
    ).toEqual({ password: 'pw' });
  });
});
