#!/bin/sh

database_name="${MYSQL_DATABASE:-${MARIADB_DATABASE:-sakila}}"
app_user="${MYSQL_USER:-${MARIADB_USER:-heraq}}"
app_password="${MYSQL_PASSWORD:-${MARIADB_PASSWORD:-heraq}}"
root_password="${MYSQL_ROOT_PASSWORD:-${MARIADB_ROOT_PASSWORD:-root}}"
client_binary="mysql"

if [ -n "${MARIADB_DATABASE:-}" ] || [ -n "${MARIADB_USER:-}" ]; then
  client_binary="mariadb"
fi

"${client_binary}" -uroot -p"${root_password}" <<SQL
CREATE USER IF NOT EXISTS '${app_user}'@'%' IDENTIFIED BY '${app_password}';
GRANT ALL PRIVILEGES ON \`${database_name}\`.* TO '${app_user}'@'%';
FLUSH PRIVILEGES;
SQL
