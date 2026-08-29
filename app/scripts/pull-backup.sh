#!/bin/bash
# Offsite pull-backup: trigger a fresh backup on the VPS, then pull the newest
# DB dump + assets snapshot down to this machine as the long-term archive.
#   - VPS keeps a short fast-recovery window (see scripts/backup.sh);
#     this script is the offsite copy for "VPS is gone" scenarios.
#   - Idempotent: safe to run any time; a missed run just catches up on the next.
# Usage: bash scripts/pull-backup.sh
# Config (env): PULL_HOST, PULL_KEY, PULL_REMOTE_DIR, PULL_LOCAL_DIR, PULL_RETENTION_DAYS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$APP_DIR")"

PULL_HOST="${PULL_HOST:-root@161.35.120.114}"
PULL_KEY="${PULL_KEY:-$HOME/.ssh/cbb_vps}"
PULL_REMOTE_DIR="${PULL_REMOTE_DIR:-/opt/cbb/backups}"
PULL_LOCAL_DIR="${PULL_LOCAL_DIR:-$PROJECT_ROOT/backups/pull}"
PULL_RETENTION_DAYS="${PULL_RETENTION_DAYS:-90}"

log() { echo "[$(date '+%F %T')] $*"; }

# Common SSH options. ConnectTimeout only covers connection establishment;
# ServerAliveInterval/CountMax let ssh/scp detect a dead peer mid-transfer and
# abort instead of hanging forever (the cause of prior hung daily runs).
SSH_OPTS=(
  -i "$PULL_KEY"
  -o BatchMode=yes
  -o ConnectTimeout=15
  -o ServerAliveInterval=10
  -o ServerAliveCountMax=3
  -o TCPKeepAlive=yes
)

# BatchMode: fail fast on missing key instead of hanging on a password prompt.
remote() {
  ssh "${SSH_OPTS[@]}" "$PULL_HOST" "$@"
}

# Scp with keepalive so a dropped connection exits (or times out) cleanly.
pull() {
  scp "${SSH_OPTS[@]}" "$PULL_HOST:$1" "$PULL_LOCAL_DIR/"
}

mkdir -p "$PULL_LOCAL_DIR"

log "Triggering fresh backup on $PULL_HOST ..."
remote "cd /opt/cbb/app/app && /usr/bin/npm run db:backup" >/dev/null

DB_FILE="$(remote "ls -1t $PULL_REMOTE_DIR/cbb-db-*.sql.gz | head -1")"
ASSET_FILE="$(remote "ls -1t $PULL_REMOTE_DIR/cbb-assets-*.tar.gz | head -1")"

log "Pulling newest DB dump: $DB_FILE"
pull "$DB_FILE"

log "Pulling newest assets snapshot: $ASSET_FILE"
pull "$ASSET_FILE"

# Prune the local offsite archive (keep recent N days only).
find "$PULL_LOCAL_DIR" -type f \( -name 'cbb-db-*.sql.gz' -o -name 'cbb-assets-*.tar.gz' \) \
  -mtime "+$PULL_RETENTION_DAYS" -delete

log "Done. Local archive: $(du -sh "$PULL_LOCAL_DIR" | cut -f1)"
