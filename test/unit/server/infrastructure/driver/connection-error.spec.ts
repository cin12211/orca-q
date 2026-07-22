import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeConnectionError } from '~/server/infrastructure/driver/connection-error';

describe('normalizeConnectionError', () => {
  it('maps ECONNREFUSED to a reachability message', () => {
    const res = normalizeConnectionError(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
        code: 'ECONNREFUSED',
      })
    );
    expect(res.message).toMatch(/refused/i);
    expect(res.hint).toBeTruthy();
    expect(res.code).toBe('ECONNREFUSED');
    expect(res.detail).toContain('ECONNREFUSED');
  });

  it('gives an SSH-aware hint for ECONNREFUSED when tunnelling', () => {
    const res = normalizeConnectionError(
      Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      }),
      { sshEnabled: true }
    );
    expect(res.hint).toMatch(/ssh/i);
  });

  it('maps host resolution failures', () => {
    const res = normalizeConnectionError(
      Object.assign(new Error('getaddrinfo ENOTFOUND db.example.com'), {
        code: 'ENOTFOUND',
      })
    );
    expect(res.message).toMatch(/host could not be resolved/i);
  });

  it('maps authentication failures (postgres 28P01)', () => {
    const res = normalizeConnectionError(
      Object.assign(new Error('password authentication failed for user "x"'), {
        code: '28P01',
      })
    );
    expect(res.message).toMatch(/authentication failed/i);
  });

  it('maps MySQL access denied', () => {
    const res = normalizeConnectionError(
      Object.assign(new Error("Access denied for user 'x'@'y'"), {
        code: 'ER_ACCESS_DENIED_ERROR',
      })
    );
    expect(res.message).toMatch(/authentication failed/i);
  });

  it('maps self-signed SSL cert errors', () => {
    const res = normalizeConnectionError(
      new Error('self-signed certificate in certificate chain')
    );
    expect(res.message).toMatch(/certificate could not be verified/i);
    expect(res.hint).toMatch(/ca certificate/i);
  });

  it('maps server-requires-SSL errors', () => {
    const res = normalizeConnectionError(
      Object.assign(
        new Error(
          'Connections using insecure transport are prohibited while --require_secure_transport=ON.'
        ),
        { code: 'ER_SECURE_TRANSPORT_REQUIRED' }
      )
    );
    expect(res.message).toMatch(/requires an ssl/i);
    expect(res.hint).toMatch(/enable ssl/i);
  });

  it('maps SSH auth failure', () => {
    const res = normalizeConnectionError(
      new Error('All configured authentication methods failed')
    );
    expect(res.message).toMatch(/ssh authentication failed/i);
  });

  it('maps a missing SSH private key', () => {
    const res = normalizeConnectionError(
      new Error(
        'SSH key authentication was selected but no private key was provided.'
      )
    );
    expect(res.message).toMatch(/private key could not be used/i);
  });

  it('maps Redis WRONGPASS/NOAUTH to auth failure', () => {
    expect(
      normalizeConnectionError(
        new Error(
          'WRONGPASS invalid username-password pair or user is disabled'
        )
      ).message
    ).toMatch(/authentication failed/i);
    expect(
      normalizeConnectionError(new Error('NOAUTH Authentication required.'))
        .message
    ).toMatch(/authentication failed/i);
  });

  it('maps Oracle invalid credentials (ORA-01017)', () => {
    const res = normalizeConnectionError(
      new Error('ORA-01017: invalid username/password; logon denied')
    );
    expect(res.message).toMatch(/authentication failed/i);
  });

  it('maps MSSQL login failure', () => {
    const res = normalizeConnectionError(
      new Error("Login failed for user 'sa'.")
    );
    expect(res.message).toMatch(/authentication failed/i);
  });

  it('reports the target database name kind for Oracle', () => {
    const res = normalizeConnectionError(
      Object.assign(new Error('database "x" does not exist'), {
        code: '3D000',
      }),
      { type: DatabaseClientType.ORACLE }
    );
    expect(res.message).toMatch(/service was not found/i);
  });

  it('falls back to a generic message with the raw detail', () => {
    const res = normalizeConnectionError(new Error('something very unusual'));
    expect(res.message).toMatch(/could not connect/i);
    expect(res.detail).toBe('something very unusual');
  });

  it('handles non-Error inputs', () => {
    expect(normalizeConnectionError('boom').detail).toBe('boom');
    expect(normalizeConnectionError(undefined).message).toBeTruthy();
  });
});
