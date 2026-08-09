import { createHash } from 'node:crypto';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  ESSLMode,
  type ISSLConfig,
} from '~/core/types/entities/connection.entity';
import { isMysqlClient } from './ports';

export function isSslEnabled(ssl?: ISSLConfig) {
  return Boolean(ssl?.mode && ssl.mode !== 'disable');
}

// Cache-key fragment for SSL. Includes the full trust material (not just the
// mode) so two connections that differ only by CA/cert/key/rejectUnauthorized
// do not collide onto the same cached adapter.
export function sslCacheKeyPart(ssl?: ISSLConfig): string {
  if (!isSslEnabled(ssl) || !ssl) return '';
  const material = JSON.stringify([
    ssl.mode,
    ssl.ca ?? '',
    ssl.cert ?? '',
    ssl.key ?? '',
    ssl.rejectUnauthorized ?? null,
  ]);
  return `-ssl:${createHash('sha1').update(material).digest('hex').slice(0, 12)}`;
}

export function createSslConnectionOptions(ssl: ISSLConfig) {
  const isVerify =
    ssl.mode === ESSLMode.VERIFY_CA || ssl.mode === ESSLMode.VERIFY_FULL;

  // Mode drives verification. require/preferred encrypt the channel but must
  // NOT fail on a self-signed/untrusted cert (the common managed-DB case) —
  // only an explicit rejectUnauthorized can force it on. verify-ca and
  // verify-full always enforce chain validation.
  const rejectUnauthorized = isVerify
    ? true
    : (ssl.rejectUnauthorized ?? false);

  const options: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    checkServerIdentity?: () => undefined;
  } = { rejectUnauthorized };

  // Omit empty strings so the TLS layer falls back to its defaults instead of
  // trying to parse a blank PEM.
  if (ssl.ca) options.ca = ssl.ca;
  if (ssl.cert) options.cert = ssl.cert;
  if (ssl.key) options.key = ssl.key;

  // verify-ca validates the chain but NOT the server hostname; verify-full
  // does both (the TLS default when rejectUnauthorized is true).
  if (ssl.mode === ESSLMode.VERIFY_CA) {
    options.checkServerIdentity = () => undefined;
  }

  return options;
}

// pg's ConnectionParameters merges `parse(connectionString)` OVER the config
// object (see node_modules/pg/lib/connection-parameters.js), so a leftover
// `sslmode`/`sslcert`/`sslkey`/`sslrootcert` query param makes pg-connection-string
// synthesize its own `ssl` value that silently clobbers the explicit `ssl`
// option below. mysql2 doesn't clobber on these (different config key), but
// warns "invalid configuration option" and says a future version may throw.
// Strip them for both so our computed ssl options are the only ones in play.
const SSL_QUERY_PARAMS = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl'];

function stripSslQueryParams(connection: string): string {
  try {
    const url = new URL(connection);
    SSL_QUERY_PARAMS.forEach(param => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return connection;
  }
}

// The "Connection String" method has no SSL Configuration accordion in the
// UI — sslmode is set purely via `?sslmode=` in the string. Neither pg nor
// mysql2 implement libpq's require/prefer "encrypt only" semantics on their
// own (both either fail closed on a self-signed cert or need an explicit
// `ssl` object), so we derive the same ISSLConfig our Form-tab accordion
// would build directly from the string whenever the caller didn't already
// pass one explicitly.
function deriveSslFromConnectionString(
  connection: string
): ISSLConfig | undefined {
  let sslModeParam: string | null;

  try {
    sslModeParam = new URL(connection).searchParams.get('sslmode');
  } catch {
    return undefined;
  }

  const mode =
    sslModeParam === 'prefer' ? ESSLMode.PREFERRED : (sslModeParam as ESSLMode);

  if (
    !mode ||
    !Object.values(ESSLMode).includes(mode) ||
    mode === ESSLMode.DISABLE
  ) {
    return undefined;
  }

  return { mode, ca: '', cert: '', key: '', rejectUnauthorized: false };
}

export function applyConnectionStringSsl({
  connection,
  type,
  ssl,
}: {
  connection: string;
  type: DatabaseClientType;
  ssl?: ISSLConfig;
}) {
  const effectiveSsl =
    isSslEnabled(ssl) && ssl ? ssl : deriveSslFromConnectionString(connection);

  // mysql2 doesn't recognize `sslmode` as a config key and warns about it
  // regardless of whether SSL ends up enabled, so strip it unconditionally.
  if (isMysqlClient(type)) {
    const uri = stripSslQueryParams(connection);

    if (!isSslEnabled(effectiveSsl) || !effectiveSsl) {
      return uri;
    }

    return { uri, ssl: createSslConnectionOptions(effectiveSsl) };
  }

  if (!isSslEnabled(effectiveSsl) || !effectiveSsl) {
    return connection;
  }

  // node-postgres ignores SSL options embedded only as a raw string, so pass a
  // config object with an explicit `ssl` block. Previously the plain string was
  // returned unchanged and SSL was silently dropped on the string path.
  if (type === DatabaseClientType.POSTGRES) {
    return {
      connectionString: stripSslQueryParams(connection),
      ssl: createSslConnectionOptions(effectiveSsl),
    };
  }

  return connection;
}
