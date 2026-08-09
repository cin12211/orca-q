#!/bin/sh
# Copy mounted certs to a private dir with perms Postgres accepts
# (key must be 0600 and owned by the postgres user), then hand off to the
# stock entrypoint. Runs as root; docker-entrypoint.sh re-drops to postgres.
set -e

out=/certs-out
mkdir -p "${out}"
cp /certs-src/ca.crt /certs-src/server.crt /certs-src/server.key "${out}/"
cp /pg-hba-src/pg_hba.conf "${out}/pg_hba.conf"
chmod 600 "${out}/server.key"
chmod 644 "${out}/server.crt" "${out}/ca.crt" "${out}/pg_hba.conf"
chown -R postgres:postgres "${out}"

exec docker-entrypoint.sh "$@"
