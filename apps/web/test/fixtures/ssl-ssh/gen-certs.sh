#!/usr/bin/env bash
# =============================================================================
# Generate CA + server certs (SSL) and an SSH keypair for the SSL+SSH fixture.
#
# Server cert SAN covers localhost / 127.0.0.1 / service names so that
# TLS verify-full succeeds whether OrcaQ connects:
#   - directly to the exposed SSL port (servername = localhost/127.0.0.1), or
#   - through the SSH tunnel (host is rewritten to 127.0.0.1 by ssh-tunnel.ts).
#
# Idempotent: skips generation if artifacts already exist unless FORCE=1.
# =============================================================================
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
certs_dir="${script_dir}/certs"
bastion_dir="${script_dir}/bastion"

mkdir -p "${certs_dir}"

if [ "${FORCE:-0}" != "1" ] && [ -f "${certs_dir}/server.crt" ] && [ -f "${certs_dir}/id_ssh" ]; then
  echo "Certs already exist (set FORCE=1 to regenerate). Skipping."
  exit 0
fi

echo "Generating CA..."
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "${certs_dir}/ca.key" \
  -out "${certs_dir}/ca.crt" \
  -days 3650 \
  -subj "/CN=OrcaQ Test CA" >/dev/null 2>&1

echo "Generating server key + CSR..."
openssl req -newkey rsa:4096 -nodes \
  -keyout "${certs_dir}/server.key" \
  -out "${certs_dir}/server.csr" \
  -subj "/CN=orcaq-test-db" >/dev/null 2>&1

cat > "${certs_dir}/san.cnf" <<'EOF'
[v3_req]
subjectAltName = @alt
[alt]
DNS.1 = localhost
DNS.2 = postgres
DNS.3 = mysql
DNS.4 = orcaq-test-db
IP.1  = 127.0.0.1
EOF

echo "Signing server cert with CA (broad SAN)..."
openssl x509 -req \
  -in "${certs_dir}/server.csr" \
  -CA "${certs_dir}/ca.crt" \
  -CAkey "${certs_dir}/ca.key" \
  -CAcreateserial \
  -out "${certs_dir}/server.crt" \
  -days 3650 \
  -extfile "${certs_dir}/san.cnf" \
  -extensions v3_req >/dev/null 2>&1

echo "Generating SSH keypair (ed25519)..."
rm -f "${certs_dir}/id_ssh" "${certs_dir}/id_ssh.pub"
ssh-keygen -t ed25519 -N '' -C 'orcaq-tunnel' -f "${certs_dir}/id_ssh" >/dev/null 2>&1

# Bastion image COPYs authorized_keys from its build context.
cp "${certs_dir}/id_ssh.pub" "${bastion_dir}/authorized_keys"

echo ""
echo "Done. Artifacts in ${certs_dir}:"
echo "  ca.crt      -> paste into OrcaQ SSL 'CA Certificate'"
echo "  server.crt  -> DB server cert (mounted into containers)"
echo "  server.key  -> DB server key (mounted into containers)"
echo "  id_ssh      -> paste into OrcaQ SSH 'Private Key' (auth method: key)"
echo "  id_ssh.pub  -> installed into the bastion authorized_keys"
