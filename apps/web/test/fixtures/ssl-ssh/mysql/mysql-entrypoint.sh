#!/bin/bash
# Copy mounted certs to a private dir owned by mysql (server refuses a
# world-readable key), then hand off to the stock entrypoint.
set -e

out=/certs-out
mkdir -p "${out}"
cp /certs-src/ca.crt /certs-src/server.crt /certs-src/server.key "${out}/"
chmod 600 "${out}/server.key"
chmod 644 "${out}/server.crt" "${out}/ca.crt"
chown -R mysql:mysql "${out}"

exec docker-entrypoint.sh "$@"
