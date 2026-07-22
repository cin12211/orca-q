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

## OrcaQ connection values — SSL + SSH (the main case)

The SSH tunnel forwards to the DB using the **host as the bastion sees it**, so
the DB host is the docker service name.

**PostgreSQL**

| Field         | Value                                               |
| ------------- | --------------------------------------------------- |
| Host          | `postgres`                                          |
| Port          | `5432`                                              |
| Database      | `orcaq`                                             |
| User / Pass   | `orcaq` / `orcaq`                                   |
| SSL mode      | `require`, `verify-ca`, or `verify-full`            |
| SSL CA cert   | contents of `certs/ca.crt` (needed for verify-\*)   |
| SSH enabled   | yes                                                 |
| SSH host/port | `localhost` / `2222`                                |
| SSH user      | `tunnel`                                            |
| SSH auth      | password `tunnel` **or** key (paste `certs/id_ssh`) |

**MySQL** — same as above with Host `mysql`, Port `3306`.

**MariaDB** — same as above with Host `mariadb`, Port `3306`.

> `verify-full` checks the server cert hostname. Because the tunnel connects to
> `127.0.0.1`, the server cert includes SANs for `127.0.0.1`, `localhost`,
> `postgres`, and `mysql`, so verification passes either way.

## OrcaQ connection values — SSL only (no SSH, optional)

Point at the exposed host ports, SSH disabled:

- PostgreSQL: Host `localhost`, Port `55432`
- MySQL: Host `localhost`, Port `33306`
- MariaDB: Host `localhost`, Port `33307`
- SSL mode `require` / `verify-ca` / `verify-full`, CA = `certs/ca.crt`

## Verify SSL is really enforced

Non-SSL connections must be rejected:

```bash
# Postgres — expect: "no pg_hba.conf entry ... no encryption"
docker exec orcaq-sslssh-postgres psql "postgresql://orcaq:orcaq@127.0.0.1:5432/orcaq?sslmode=disable" -c 'select 1' || echo "rejected (expected)"

# MySQL — expect: "Connections using insecure transport are prohibited"
docker exec orcaq-sslssh-mysql mysql -uorcaq -porcaq --ssl-mode=DISABLED -e 'select 1' || echo "rejected (expected)"
```
