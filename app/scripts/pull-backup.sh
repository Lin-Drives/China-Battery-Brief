#!/bin/bash
# Offsite pull-backup: trigger a fresh backup on the VPS, then pull the newest
# DB dump + assets snapshot down to this machine as the long-term archive.
#   - VPS keeps a short fast-recovery window (see scripts/backup.sh);
#     this script is the offsite copy for "VPS is gone" scenarios.
#   - Idempotent: safe to run any time; a missed run just catches up on the next.
# Usage: bash scripts/pull-backup.sh
# Config (env): PULL_HOST, PULL_KEY, PULL_REMOTE_DIR, PULL_LOCAL_DIR,
#               PULL_RETENTION_DAYS, PULL_RSYNC, PULL_TIMEOUT, PULL_RETRIES
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$APP_DIR")"

PULL_HOST="${PULL_HOST:-root@161.35.120.114}"
PULL_KEY="${PULL_KEY:-$HOME/.ssh/cbb_vps}"
PULL_REMOTE_DIR="${PULL_REMOTE_DIR:-/opt/cbb/backups}"
PULL_LOCAL_DIR="${PULL_LOCAL_DIR:-$PROJECT_ROOT/backups/pull}"
PULL_RETENTION_DAYS="${PULL_RETENTION_DAYS:-90}"
PULL_TIMEOUT="${PULL_TIMEOUT:-300}"
PULL_RETRIES="${PULL_RETRIES:-3}"

# Prefer the full GNU rsync (Homebrew) over Apple's openrsync (protocol 29, fewer flags).
# In login shells 'rsync' already resolves to /opt/homebrew/bin/rsync; make that explicit
# so a launchd job running with the default /usr/bin PATH also picks the robust one.
if command -v /opt/homebrew/bin/rsync >/dev/null 2>&1; then
  RSYNC="${PULL_RSYNC:-/opt/homebrew/bin/rsync}"
else
  RSYNC="${PULL_RSYNC:-rsync}"
fi

log() { echo "[$(date '+%F %T')] $*"; }

# Common SSH options. ConnectTimeout only covers connection establishment;
# ServerAliveInterval/CountMax let ssh detect a dead peer mid-transfer and
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

# rsync runs its own ssh transport; pass the same keepalive flags as a single -e string.
RSYNC_E="ssh ${SSH_OPTS[*]}"

# Pull one file with:
#   --partial  keep partially-transferred bytes so a retry resumes instead of restarting
#   -c         checksum-based, so a truncated-but-same-size file is still detected & re-sent
#   --timeout  abort when no data moves for N seconds (big-file transfers that stall silently)
# After transfer, gzip -t catches a bad source archive; a corrupt partial is deleted and
# re-fetched up to PULL_RETRIES times. Never leave a silently-corrupt 0-byte/truncated file.
pull() {
  local src="$1" name dst tmp attempt
  name="$(basename "$src")"
  dst="$PULL_LOCAL_DIR/$name"
  tmp="$PULL_LOCAL_DIR/.${name}.part"

  for attempt in $(seq 1 "$PULL_RETRIES"); do
    log "Pulling $name (attempt $attempt/$PULL_RETRIES) ..."
    if "$RSYNC" -e "$RSYNC_E" --partial -c --timeout="$PULL_TIMEOUT" \
        "$PULL_HOST:$src" "$tmp"; then
      if gzip -t "$tmp" 2>/dev/null; then
        mv -f "$tmp" "$dst"
        log "  OK: $name ($(du -h "$dst" | cut -f1))"
        return 0
      fi
      log "  WARNING: $name failed gzip -t (corrupt source on VPS); discarding and retrying"
    else
      log "  WARNING: rsync exit != 0 for $name; discarding partial and retrying"
    fi
    rm -f "$tmp"
    sleep 5
  done

  log "ERROR: could not validate $name after $PULL_RETRIES attempts" >&2
  rm -f "$tmp"
  return 1
}

mkdir -p "$PULL_LOCAL_DIR"

log "Triggering fresh backup on $PULL_HOST ..."
remote "cd /opt/cbb/app/app && /usr/bin/npm run db:backup" >/dev/null

DB_FILE="$(remote "ls -1t $PULL_REMOTE_DIR/cbb-db-*.sql.gz | head -1")"
ASSET_FILE="$(remote "ls -1t $PULL_REMOTE_DIR/cbb-assets-*.tar.gz | head -1")"

pull "$DB_FILE"
pull "$ASSET_FILE"

# Prune the local offsite archive (keep recent N days only).
find "$PULL_LOCAL_DIR" -type f \( -name 'cbb-db-*.sql.gz' -o -name 'cbb-assets-*.tar.gz' \) \
  -mtime "+$PULL_RETENTION_DAYS" -delete

log "Done. Local archive: $(du -sh "$PULL_LOCAL_DIR" | cut -f1)"
