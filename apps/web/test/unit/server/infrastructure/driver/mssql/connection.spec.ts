import { describe, expect, it } from 'vitest';
import {
  normalizeMssqlConnection,
  toMssqlUri,
} from '~/server/infrastructure/driver/mssql/connection';

describe('normalizeMssqlConnection', () => {
  it('parses ADO.NET strings', () => {
    const settings = normalizeMssqlConnection(
      'Server=tcp:db.example.com,14330;Database=shop;User Id=app;Password=p@ss;TrustServerCertificate=false'
    );

    expect(settings).toMatchObject({
      host: 'db.example.com',
      port: 14330,
      user: 'app',
      password: 'p@ss',
      database: 'shop',
      options: { encrypt: true, trustServerCertificate: false },
    });
  });

  it('parses sqlserver:// URIs', () => {
    const settings = normalizeMssqlConnection(
      'sqlserver://sa:secret%21@localhost:1433/master?encrypt=false'
    );

    expect(settings).toMatchObject({
      host: 'localhost',
      port: 1433,
      user: 'sa',
      password: 'secret!',
      database: 'master',
      options: { encrypt: false, trustServerCertificate: true },
    });
  });

  it('uses the named instance instead of a port', () => {
    const settings = normalizeMssqlConnection(
      'Server=localhost\\SQLEXPRESS;Database=master;User Id=sa;Password=x'
    );

    expect(settings.host).toBe('localhost');
    expect(settings.port).toBeUndefined();
    expect(settings.options.instanceName).toBe('SQLEXPRESS');
  });

  it('maps structured form fields and verifying SSL', () => {
    const settings = normalizeMssqlConnection({
      host: 'db',
      port: 1444,
      user: 'u',
      password: 'p',
      database: 'd',
      ssl: { rejectUnauthorized: true, ca: 'CA' },
    } as never);

    expect(settings).toMatchObject({
      host: 'db',
      port: 1444,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        cryptoCredentialsDetails: { ca: 'CA' },
      },
    });
  });

  it('defaults to encrypted connections that accept untrusted certificates', () => {
    const settings = normalizeMssqlConnection({ host: 'db' } as never);

    expect(settings.port).toBe(1433);
    expect(settings.options.encrypt).toBe(true);
    expect(settings.options.trustServerCertificate).toBe(true);
  });
});

describe('toMssqlUri', () => {
  it('rewrites ADO.NET strings as URIs', () => {
    const uri = new URL(
      toMssqlUri('Server=db,1500;Database=shop;User Id=app;Password=a b')
    );

    expect(uri.protocol).toBe('sqlserver:');
    expect(uri.hostname).toBe('db');
    expect(uri.port).toBe('1500');
    expect(decodeURIComponent(uri.password)).toBe('a b');
    expect(uri.pathname).toBe('/shop');
  });

  it('leaves URIs unchanged', () => {
    expect(toMssqlUri('sqlserver://a@b:1/c')).toBe('sqlserver://a@b:1/c');
  });
});
