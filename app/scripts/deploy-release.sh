#!/bin/bash
# Release: build local dist -> push to VPS -> seed DB (content) -> restart cbb.
# This is the "发版式上线" path used by the weekly Wednesday 24:00 launchd job.
#
# Flow (keep the VPS's own seed.ts/schema.ts — they are AHEAD of the repo and
#       already match the live MariaDB schema; we ONLY push build output + issue data):
#   1. Local: npm run build            (dist/ = static + API bundle, platform-free JS)
#   2. scp dist/       -> VPS app/dist/
#   3. scp seed-content(+zh) -> VPS app/db/   (new issue markdown + issues.json/-zh)
#   4. VPS: npm run db:seed            (VPS's own seed.ts; idempotent onDuplicateKeyUpdate)
#   5. VPS: chown www-data + systemctl restart cbb
#   6. Verify: curl 200 + newest issue number present in DB
#
# Config (env): DEPLOY_HOST (default root@161.35.120.114), DEPLOY_KEY (default $HOME/.ssh/cbb_vps),
#               DEPLOY_REMOTE (=/opt/cbb/app/app), DEPLOY_ALLOW_MISSING (=1 to skip DB-max guard)
# Run: bash scripts/deploy-release.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

DEPLOY_HOST="${DEPLOY_HOST:-root@161.35.120.114}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/cbb_vps}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-/opt/cbb/app/app}"

log() { echo "[$(date '+%F %T')] $*"; }

# Reuse the keepalive SSH options that fixed the pull-backup hang.
SSH_OPTS=(
  -i "$DEPLOY_KEY"
  -o BatchMode=yes
  -o ConnectTimeout=20
  -o ServerAliveInterval=10
  -o ServerAliveCountMax=3
  -o TCPKeepAlive=yes
)
remote() { ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"; }

ALLOW_MISSING="${DEPLOY_ALLOW_MISSING:-0}"

log "== Step 1/6 · local build =="
( cd "$APP_DIR" && npm run build )

rsync_cmd() { rsync -az -e "ssh -i $DEPLOY_KEY -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=10 -o ServerAliveCountMax=3" "$@"; }

log "== Step 2/6 · push dist/ -> $DEPLOY_HOST:$DEPLOY_REMOTE/dist =="
remote "mkdir -p '$DEPLOY_REMOTE/dist'"
rsync_cmd "$APP_DIR/dist/" "$DEPLOY_HOST:$DEPLOY_REMOTE/dist/"

log "== Step 3/6 · push seed-content (+zh) -> $DEPLOY_HOST:$DEPLOY_REMOTE/db =="
remote "mkdir -p '$DEPLOY_REMOTE/db/seed-content' '$DEPLOY_REMOTE/db/seed-content-zh'"
rsync_cmd "$APP_DIR/db/seed-content/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content/"
rsync_cmd "$APP_DIR/db/seed-content-zh/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content-zh/"

log "== Step 4/6 · run db:seed on VPS (idempotent content upsert) =="
remote "cd '$DEPLOY_REMOTE' && npm run db:seed"

log "== Step 5/6 · chown www-data + restart cbb =="
remote "chown -R www-data:www-data '$DEPLOY_REMOTE/dist' '$DEPLOY_REMOTE/db' && systemctl restart cbb"

log "== Step 6/6 · verify =="
sleep 5
HTTP_CODE="$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000")"
log "App HTTP status (VPS localhost:3000): $HTTP_CODE"
if [ "$HTTP_CODE" != "200" ]; then
  log "ERROR: app did not return 200 after restart (got $HTTP_CODE)"
  remote "journalctl -u cbb -n 30 --no-pager" 2>/dev/null | tail -30 || true
  exit 1
fi

# Verify the newest issue made it into the DB (if we know what to check).
NEWEST_LOCAL="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(max(x["number"] for x in d))' "$APP_DIR/db/seed-content/issues.json" 2>/dev/null || echo '')"
if [ -n "$NEWEST_LOCAL" ]; then
  DB_MAX="$(remote "mysql -u root cbb -N -e 'SELECT COALESCE(MAX(number),0) FROM issues'" 2>/dev/null || echo '')"
  if [ -n "$DB_MAX" ]; then
    log "DB max issue number: $DB_MAX (local newest: $NEWEST_LOCAL)"
    if [ "$DB_MAX" -lt "$NEWEST_LOCAL" ]; then
      log "WARNING: DB max ($DB_MAX) < local newest ($NEWEST_LOCAL) — seed may not have run fully."
      [ "$ALLOW_MISSING" = "1" ] && log "(DEPLOY_ALLOW_MISSING=1, continuing)" || exit 1
    fi
  fi
fi

log "== Done. Release live on https://chinabatterybrief.com =="
