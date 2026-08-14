#!/bin/bash
# Restore the project MySQL database from a backup produced by backup.sh.
# Usage: npm run db:restore -- <path-to>.sql.gz   (DANGER: overwrites current DB)
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: npm run db:restore -- <backup.sql.gz>" >&2
  exit 1
fi
BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$APP_DIR")"

if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

eval "$(node "$SCRIPT_DIR/db-env.mjs")"

MYSQL_BIN="${MYSQL_BIN:-$PROJECT_ROOT/.local-mysql/mysql/bin}"
MYSQL="$MYSQL_BIN/mysql"
if [ ! -x "$MYSQL" ]; then
  echo "mysql client not found at $MYSQL — set MYSQL_BIN for managed DBs" >&2
  exit 1
fi

echo "Restoring $BACKUP_FILE into $DB_NAME on $DB_HOST:$DB_PORT …"
gunzip -c "$BACKUP_FILE" | MYSQL_PWD="$DB_PASS" "$MYSQL" --no-defaults \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"
echo "Restore complete."
