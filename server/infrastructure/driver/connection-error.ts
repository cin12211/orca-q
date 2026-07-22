import { DatabaseClientType } from '~/core/constants/database-client-type';

/**
 * A user-facing description of a failed database connection attempt.
 * `message` says what went wrong in plain language; `hint` says how to fix it;
 * `detail` carries the raw driver error for power users / bug reports.
 */
export interface NormalizedConnectionError {
  message: string;
  hint?: string;
  code?: string;
  detail?: string;
}

interface NormalizeContext {
  type?: DatabaseClientType;
  sslEnabled?: boolean;
  sshEnabled?: boolean;
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    if (typeof code === 'number') return String(code);
  }
  return undefined;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
}

type Rule = {
  when: (ctx: { code?: string; text: string; lower: string }) => boolean;
  build: (ctx: NormalizeContext) => { message: string; hint?: string };
};

// Ordered most-specific first. SSL/SSH rules come before generic network rules
// so a TLS or tunnel failure is reported as such instead of "host unreachable".
const RULES: Rule[] = [
  // ---- SSH tunnel ---------------------------------------------------------
  {
    when: ({ lower }) =>
      lower.includes('all configured authentication methods failed'),
    build: () => ({
      message: 'SSH authentication failed.',
      hint: 'Check the SSH username, and the password or private key (and its passphrase).',
    }),
  },
  {
    when: ({ lower }) =>
      lower.includes('no private key was provided') ||
      lower.includes('cannot parse privatekey') ||
      lower.includes('unsupported key format') ||
      (lower.includes('privatekey') && lower.includes('encrypted')),
    build: () => ({
      message: 'The SSH private key could not be used.',
      hint: 'Verify the private key is valid and, if it is encrypted, provide the correct passphrase.',
    }),
  },
  {
    when: ({ lower }) =>
      lower.includes('timed out while waiting for handshake') ||
      lower.includes('ssh tunnel requires') ||
      lower.includes('missing host in ssh'),
    build: () => ({
      message: 'Could not establish the SSH tunnel.',
      hint: 'Check the SSH host, port, and that the SSH server is reachable.',
    }),
  },

  // ---- SSL / TLS ----------------------------------------------------------
  {
    when: ({ code, lower }) =>
      code === 'ER_SECURE_TRANSPORT_REQUIRED' ||
      lower.includes('insecure transport are prohibited') ||
      lower.includes('no pg_hba.conf entry') ||
      (lower.includes('no encryption') && lower.includes('server')),
    build: () => ({
      message: 'The server requires an SSL/TLS connection.',
      hint: 'Enable SSL for this connection (mode "require" or stricter).',
    }),
  },
  {
    when: ({ code, lower }) =>
      code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
      code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
      lower.includes('self-signed certificate') ||
      lower.includes('self signed certificate') ||
      lower.includes('unable to verify the first certificate'),
    build: () => ({
      message: 'The server SSL certificate could not be verified.',
      hint: 'Provide the CA certificate for "verify-ca"/"verify-full", or use SSL mode "require" to skip verification.',
    }),
  },
  {
    when: ({ code, lower }) =>
      code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
      lower.includes('altname') ||
      lower.includes('hostname/ip does not match') ||
      lower.includes("does not match certificate's"),
    build: () => ({
      message: 'The server hostname does not match its SSL certificate.',
      hint: 'Use SSL mode "verify-ca" instead of "verify-full", or connect using the hostname on the certificate.',
    }),
  },
  {
    when: ({ lower }) =>
      lower.includes('wrong version number') ||
      lower.includes('packets out of order') ||
      lower.includes('ssl routines'),
    build: () => ({
      message: 'SSL negotiation with the server failed.',
      hint: 'The server may not support SSL, or SSL is misconfigured. Try disabling SSL or check the server settings.',
    }),
  },

  // ---- Authentication / database ------------------------------------------
  {
    when: ({ code, lower }) =>
      code === '28P01' ||
      code === '28000' ||
      code === 'ER_ACCESS_DENIED_ERROR' ||
      code === 'ER_DBACCESS_DENIED_ERROR' ||
      lower.includes('password authentication failed') ||
      lower.includes('access denied for user') ||
      // Redis auth failures
      lower.includes('wrongpass') ||
      lower.includes('noauth') ||
      lower.includes('invalid username-password') ||
      lower.includes('authentication required') ||
      // Oracle invalid credentials
      lower.includes('ora-01017') ||
      // MSSQL login failed
      lower.includes('login failed for user'),
    build: () => ({
      message: 'Authentication failed — wrong username or password.',
      hint: 'Double-check the database username and password.',
    }),
  },
  {
    when: ({ code, lower }) =>
      code === '3D000' ||
      code === 'ER_BAD_DB_ERROR' ||
      lower.includes('does not exist') ||
      lower.includes('unknown database'),
    build: ctx => ({
      message: `The target ${ctx.type === DatabaseClientType.ORACLE ? 'service' : 'database'} was not found.`,
      hint: 'Check the database/service name is spelled correctly and exists on the server.',
    }),
  },

  // ---- Network ------------------------------------------------------------
  {
    when: ({ code }) => code === 'ECONNREFUSED',
    build: ctx => ({
      message: 'Connection refused by the server.',
      hint: ctx.sshEnabled
        ? 'The SSH host is reachable but the database host/port (as seen from the SSH server) refused the connection. Check the database host and port.'
        : 'Check the host and port, that the database is running, and that it accepts remote connections.',
    }),
  },
  {
    when: ({ code, lower }) =>
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      lower.includes('getaddrinfo'),
    build: ctx => ({
      message: 'The host could not be resolved.',
      hint: ctx.sshEnabled
        ? 'Check the SSH host name, and the database host name as resolvable from the SSH server.'
        : 'Check the host name for typos and that DNS can resolve it.',
    }),
  },
  {
    when: ({ code, lower }) =>
      code === 'ETIMEDOUT' ||
      code === 'ESOCKETTIMEDOUT' ||
      lower.includes('timeout') ||
      lower.includes('timed out'),
    build: ctx => ({
      message: 'The connection timed out.',
      hint: ctx.sshEnabled
        ? 'Check the SSH host is reachable and the database port is open from the SSH server (firewall/security group).'
        : 'Check the host/port, firewall or security-group rules, and any required VPN.',
    }),
  },
  {
    when: ({ code }) => code === 'ECONNRESET' || code === 'EPIPE',
    build: () => ({
      message: 'The connection was reset by the server.',
      hint: 'This often means an SSL mismatch or the server closed the connection. Verify the SSL settings and server availability.',
    }),
  },
];

/**
 * Turn a raw connection/driver error into a clear, actionable message the
 * connection form can show, so users are not stuck on a bare "connection
 * failed" with no idea what to fix.
 */
export function normalizeConnectionError(
  error: unknown,
  ctx: NormalizeContext = {}
): NormalizedConnectionError {
  const code = getErrorCode(error);
  const text = getErrorText(error);
  const lower = text.toLowerCase();

  for (const rule of RULES) {
    if (rule.when({ code, text, lower })) {
      const { message, hint } = rule.build(ctx);
      return { message, hint, code, detail: text };
    }
  }

  return {
    message: 'Could not connect to the database.',
    hint: 'Check the connection details and try again. See the details below for the exact error.',
    code,
    detail: text,
  };
}
