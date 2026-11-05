# OrcaQ SSL + SSH connection fixture

Spins up **PostgreSQL** and **MySQL** that **force SSL**, reachable through an
**SSH bastion** (password _and_ key auth). Use it to manually test OrcaQ
connecting to a DB that needs SSL + SSH.

## Layout

| Path                  | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `gen-certs.sh`        | Generates the CA, server certs, and SSH keypair    |
| `docker-compose.yml`  | postgres + mysql (force SSL) + bastion (SSH)       |
| `bastion/`            | Alpine + openssh, forwards TCP to the DBs          |
| `postgres/`, `mysql/` | Cert-perms entrypoint, force-SSL config, seed data |
| `certs/`              | Generated artifacts (gitignored)                   |

## Run

```bash
cd test/fixtures/ssl-ssh
./start.sh          # generates certs, builds bastion, starts everything
./stop.sh           # stop
./stop.sh -v        # stop + drop volumes
FORCE=1 ./gen-certs.sh   # regenerate certs (then restart)
```

Ports on the host:

| Service  | Host port | Notes                               |
| -------- | --------- | ----------------------------------- |
| bastion  | `2222`    | SSH jump host, user `tunnel`        |
| postgres | `55432`   | optional — direct SSL test (no SSH) |
| mysql    | `33306`   | optional — direct SSL test (no SSH) |
| mariadb  | `33307`   | optional — direct SSL test (no SSH) |

## Credentials

- **DB user / password / database:** `orcaq` / `orcaq` / `orcaq`
- **SSH user:** `tunnel`, **password:** `tunnel`
- **SSH private key:** contents of `certs/id_ssh`
- **CA certificate (for verify-ca / verify-full):** contents of `certs/ca.crt`

Print them:

```bash
cat certs/ca.crt      # -> OrcaQ SSL "CA Certificate"
cat certs/id_ssh      # -> OrcaQ SSH "Private Key"
```

## Test case matrix

Every case below is testable for all three DB types (`postgres`, `mysql`,
`mariadb`). Two independent axes: **method** (Host/Port form vs. Connection
String) × **network path** (SSH tunnel vs. direct exposed port). SSL is
always required by the server in every case — the fixture forces it.

### Case 1 — SSH tunnel + SSL, method = "Host / Port" (Form) — main case

The SSH tunnel forwards to the DB using the **host as the bastion sees it**,
so the DB host below is the docker service name, not `localhost`.

| DB type    | Host       | Port   | Database | User / Pass       |
| ---------- | ---------- | ------ | -------- | ----------------- |
| PostgreSQL | `postgres` | `5432` | `orcaq`  | `orcaq` / `orcaq` |
| MySQL      | `mysql`    | `3306` | `orcaq`  | `orcaq` / `orcaq` |
| MariaDB    | `mariadb`  | `3306` | `orcaq`  | `orcaq` / `orcaq` |

Same for all three:

- SSL Configuration accordion: **Enable SSL** on, **SSL Mode** =
  `require`, `verify-ca`, or `verify-full`; **CA Certificate** = contents of
  `certs/ca.crt` (only needed for `verify-ca`/`verify-full` — `require` works
  with the CA box empty)
- SSH Tunnel accordion: **Over SSH** on, Server `localhost`, Port `2222`,
  User `tunnel`, Password `tunnel` **or** check "SSH Key Authentication" and
  paste `certs/id_ssh` into Private Key

> `verify-full` checks the server cert hostname. Because the tunnel connects
> to `127.0.0.1`, the server cert includes SANs for `127.0.0.1`, `localhost`,
> `postgres`, `mysql`, and `mariadb`, so verification passes either way.

### Case 2 — SSH tunnel + SSL, method = "Connection String"

Same DB targets as Case 1, but everything SSL goes into the connection string
query params instead of an accordion (see limitation note below the table in
[Method tab: "Connection String"](#method-tab-connection-string)):

| DB type    | Connection String                                              |
| ---------- | -------------------------------------------------------------- |
| PostgreSQL | `postgresql://orcaq:orcaq@postgres:5432/orcaq?sslmode=require` |
| MySQL      | `mysql://orcaq:orcaq@mysql:3306/orcaq?sslmode=require`         |
| MariaDB    | `mariadb://orcaq:orcaq@mariadb:3306/orcaq?sslmode=require`     |

SSH Tunnel accordion: same as Case 1 (Server `localhost`, Port `2222`, User
`tunnel`, password `tunnel` or key `certs/id_ssh`).

Only `sslmode=require` or `sslmode=prefer` actually work through this tab —
see the limitation note further down.

### Case 3 — SSL only, no SSH, method = "Host / Port" (Form)

Point straight at the exposed host ports, SSH tunnel switch left off:

| DB type    | Host        | Port    | Database | User / Pass       |
| ---------- | ----------- | ------- | -------- | ----------------- |
| PostgreSQL | `localhost` | `55432` | `orcaq`  | `orcaq` / `orcaq` |
| MySQL      | `localhost` | `33306` | `orcaq`  | `orcaq` / `orcaq` |
| MariaDB    | `localhost` | `33307` | `orcaq`  | `orcaq` / `orcaq` |

SSL Configuration accordion: same as Case 1 (`require` / `verify-ca` /
`verify-full`, CA = `certs/ca.crt` for verify-\*).

### Case 4 — SSL only, no SSH, method = "Connection String"

| DB type    | Connection String                                                |
| ---------- | ---------------------------------------------------------------- |
| PostgreSQL | `postgresql://orcaq:orcaq@localhost:55432/orcaq?sslmode=require` |
| MySQL      | `mysql://orcaq:orcaq@localhost:33306/orcaq?sslmode=require`      |
| MariaDB    | `mariadb://orcaq:orcaq@localhost:33307/orcaq?sslmode=require`    |

Same `sslmode=require`/`prefer`-only limitation as Case 2.

### Case 5 — negative test: SSL not requested (expect rejection)

Leave **Enable SSL** off (Form tab) or omit `sslmode`/use
`sslmode=disable` (Connection String tab), any DB type/host from Cases 1–4.
The server forces SSL, so the test must fail — this exercises the error
banner in `ConnectionStatusSection.vue`:

| DB type         | Expected surfaced error                                            |
| --------------- | ------------------------------------------------------------------ |
| PostgreSQL      | message mentions no encryption / SSL required (from `pg_hba.conf`) |
| MySQL / MariaDB | "Connections using insecure transport are prohibited"              |

If this instead reports success, SSL enforcement in the fixture (or in the
connection driver) is broken — file a bug, don't just retry.

## UI form field mapping (Create Connection modal)

Exact fields in OrcaQ's "Create Connection" modal, with the input `id`, and
what to type for this fixture. Component source:
`components/modules/connection/components/CreateConnectionModal.vue`,
`ConnectionSSLConfig.vue`, `ConnectionSSHTunnel.vue`.

### Step 1 — pick DB type

Select `postgres`, `mysql`, or `mariadb`, then **Next**.

### Step 2 — method tab: "Host / Port" (Form)

| Label (id)                      | Type               | Value (SSH case)                 | Value (SSL-only case)       |
| ------------------------------- | ------------------ | -------------------------------- | --------------------------- |
| Host (`#host`)                  | text, required     | `postgres` / `mysql` / `mariadb` | `localhost`                 |
| Port (`#port`)                  | text, required     | `5432` / `3306` / `3306`         | `55432` / `33306` / `33307` |
| User (`#username`)              | text, required     | `orcaq`                          | `orcaq`                     |
| Password (`#password`)          | password, optional | `orcaq`                          | `orcaq`                     |
| Database (`#structured-target`) | text, required     | `orcaq`                          | `orcaq`                     |

The **SSL Configuration** accordion only appears under this "Host / Port" tab
(it is not shown for the "Connection String" tab):

| Label (id)                       | Type          | Value                                                                     |
| -------------------------------- | ------------- | ------------------------------------------------------------------------- |
| Enable SSL (`#ssl-enabled`)      | switch        | on                                                                        |
| SSL Mode (`#ssl-mode`)           | select        | `disable` / `preferred` / `require` / `verify-ca` / `verify-full`         |
| CA Certificate (`#ssl-ca`)       | textarea, PEM | paste contents of `certs/ca.crt` (required for `verify-ca`/`verify-full`) |
| Client Certificate (`#ssl-cert`) | textarea, PEM | leave empty (fixture has no client-cert auth)                             |
| SSL Key (`#ssl-key`)             | textarea, PEM | leave empty                                                               |

Both CA/Cert/Key textareas accept drag-and-drop of a `.pem`/`.crt`/`.key` file.

> There's a `rejectUnauthorized` flag in the connection payload but no UI
> control for it — it's hardcoded to `true` whenever SSL is enabled.

### Method tab: "Connection String"

| Label (id)                               | Type           | Value                                                               |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------- |
| Connection String (`#connection-string`) | text, required | e.g. `postgresql://orcaq:orcaq@postgres:5432/orcaq?sslmode=require` |

There is no SSL Configuration accordion on this tab — SSL comes purely from
`?sslmode=` in the string. OrcaQ parses that query param and builds the same
SSL config the Form tab would (`useConnectionForm.ts` →
`buildSSLConfigFromConnectionString`). The SSH Tunnel accordion below still
applies independently of the method tab.

> **Limitation:** because there's no CA/cert/key textarea on this tab,
> `sslmode=verify-ca` or `sslmode=verify-full` here will always fail with a
> self-signed-certificate error — there's nowhere to paste `certs/ca.crt`.
> Only `sslmode=require` (or `prefer`) actually completes through this tab;
> use the "Host / Port" (Form) tab for verify-ca/verify-full.

### SSH Tunnel accordion (shown under both method tabs)

| Label (id)                              | Type                               | Value                                                       |
| --------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Over SSH (`#ssh-enabled`)               | switch                             | on                                                          |
| Server (`#ssh-host`)                    | text, required                     | `localhost`                                                 |
| Port (`#ssh-port`)                      | number                             | `2222`                                                      |
| User (`#ssh-user`)                      | text, required                     | `tunnel`                                                    |
| Password (`#ssh-password`)              | password                           | `tunnel` (required unless "SSH Key Authentication" checked) |
| Store in keychain (`#ssh-keychain`)     | checkbox, default on               | leave checked (desktop app only)                            |
| SSH Key Authentication (`#ssh-use-key`) | checkbox                           | check to switch to key auth instead of password             |
| Private Key (`#ssh-key-file`)           | textarea, only if key auth checked | paste contents of `certs/id_ssh`                            |

Password and key fields are independent — checking "SSH Key Authentication"
just reveals the Private Key box; it doesn't hide the Password field. The
form requires host + user + (password **or** private key, whichever mode is
active) before "Test"/"Create" is enabled.

> None of the SSL/SSH fields show a red-asterisk required marker in the UI
> (unlike Host/Port/User/Database) — required-ness here is enforced only
> functionally (disables Test/Create), not visually. Don't expect an inline
> error message on an empty SSH Server/User/Password field either.

### Test / Create buttons and result panel

- **Test** button runs a health check without saving; **Create**
  (or **Update** when editing) runs the same health check first and only
  saves if it succeeds.
- Result appears below the form (`ConnectionStatusSection.vue`):
  - testing: spinner, "Testing connection..."
  - success: green banner, "Connection successful! Your database is ready to use."
  - error: red banner with the driver's message, an optional hint line, a
    copy-error button, and a "Show technical details" toggle (expanded by
    default) that reveals the raw driver error text.

## Verify SSL is really enforced

Non-SSL connections must be rejected:

```bash
# Postgres — expect: "no pg_hba.conf entry ... no encryption"
docker exec orcaq-sslssh-postgres psql "postgresql://orcaq:orcaq@127.0.0.1:5432/orcaq?sslmode=disable" -c 'select 1' || echo "rejected (expected)"

# MySQL — expect: "Connections using insecure transport are prohibited"
docker exec orcaq-sslssh-mysql mysql -uorcaq -porcaq --ssl-mode=DISABLED -e 'select 1' || echo "rejected (expected)"
```
