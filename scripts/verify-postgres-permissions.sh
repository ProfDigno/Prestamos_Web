#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/server/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe $ENV_FILE" >&2
  exit 1
fi

DB_NAME="$(sed -n 's/^DB_NAME=//p' "$ENV_FILE" | head -n 1)"
DB_USER="$(sed -n 's/^DB_USER=//p' "$ENV_FILE" | head -n 1)"

if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
  echo "DB_NAME y DB_USER deben estar definidos en server/.env" >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 --dbname="$DB_NAME" -v app_user="$DB_USER" <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE prestamo_reemplazo, pago_reemplazo, descuento_reemplazo
  TO :"app_user";

GRANT USAGE, SELECT, UPDATE
  ON SEQUENCE prestamo_reemplazo_idprestamo_reemplazo_seq
  TO :"app_user";

SQL

PERMISSIONS="$(sudo -u postgres psql -At -v app_user="$DB_USER" --dbname="$DB_NAME" <<'SQL'
SELECT has_table_privilege(:'app_user', 'prestamo_reemplazo', 'INSERT') || '|' || has_table_privilege(:'app_user', 'pago_reemplazo', 'INSERT') || '|' || has_table_privilege(:'app_user', 'descuento_reemplazo', 'INSERT');
SQL
)"
if [[ "$PERMISSIONS" != "true|true|true" ]]; then
  echo "Faltan permisos de inserción para $DB_USER: $PERMISSIONS" >&2
  exit 1
fi

echo "Permisos PostgreSQL verificados para $DB_USER en $DB_NAME"
