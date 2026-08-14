#!/bin/bash
# Backup the project MySQL database + static assets snapshot.
# Usage: npm run db:backup   (or: bash scripts/backup.sh)
# Retention: keep the newest N backups (default 14), prune the rest.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$APP_DIR")"

if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

# Parse DATABASE_URL via node (handles URL-encoding) without echoing secrets.
eval "$(node "$SCRIPT_DIR/db-env.mjs")"

MYSQL_BIN="${MYSQL_BIN:-$PROJECT_ROOT/.local-mysql/mysql/bin}"
DUMP="$MYSQL_BIN/mysqldump"
RETENTION="${BACKUP_RETENTION:-14}"
BACKUP_DIR="${BACKUP_ROOT:-$PROJECT_ROOT/backups/db}"

if [ ! -x "$DUMP" ]; then
  echo "mysqldump not found at $DUMP — set MYSQL_BIN or BACKUP_ROOT for managed DBs" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/cbb-db-$TS.sql.gz"

# --single-transaction: consistent snapshot without locking the app.
MYSQL_PWD="$DB_PASS" "$DUMP" --no-defaults \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --quick --routines --triggers \
  "$DB_NAME" | gzip > "$OUT"

echo "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Prune old backups.
ls -1t "$BACKUP_DIR"/cbb-db-*.sql.gz 2>/dev/null | tail -n +$((RETENTION + 1)) |
  while read -r old; do
    echo "Pruning $old"
    rm -f "$old"
  done

# Snapshot public assets (regenerable, but cheap insurance alongside the DB).
ASSET_OUT="$BACKUP_DIR/cbb-assets-$TS.tar.gz"
tar -czf "$ASSET_OUT" -C "$APP_DIR" public 2>/dev/null || true
echo "Assets snapshot: $ASSET_OUT"
