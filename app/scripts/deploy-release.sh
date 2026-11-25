#!/bin/bash
# Release: build local dist -> push to VPS -> seed DB (content) -> restart cbb.
# This is the "发版式上线" path used by the weekly Wednesday 24:00 launchd job.
#
# Flow (keep the VPS's own seed.ts/schema.ts — they are AHEAD of the repo and
#       already match the live MariaDB schema; we ONLY push build output + issue data):
#   1. Plan: diff local seed content vs the live DB (new issues, title changes, md5 of
#      the markdown) and ask for confirmation; nothing changed -> no-op (skip).
#   2. Local: npm run build            (dist/ = static + API bundle, platform-free JS)
#   3. rsync dist/       -> VPS app/dist/
#   4. rsync seed-content(+zh) -> VPS app/db/   (new issue markdown + issues.json/-zh)
#      --only-new: push just the new issue, seed it, then restore the full content dirs
#   5. VPS: npm run db:seed            (VPS's own seed.ts; idempotent onDuplicateKeyUpdate)
#   6. VPS: chown www-data + systemctl restart cbb
#   7. Verify: curl 200 + newest issue number present in DB
#
# Config (env): DEPLOY_HOST (default root@161.35.120.114), DEPLOY_KEY (default $HOME/.ssh/cbb_vps),
#               DEPLOY_REMOTE (=/opt/cbb/app/app), DEPLOY_FORCE (=1 to re-release with no content changes)
#
#   --dry-run    只打印变更清单，不构建、不同步、不重启
#   --yes / -y   跳过交互确认（launchd/cron 非 TTY 时也会自动跳过）
#   --only-new   只把新期灌库（DEPLOY_ONLY_NEW=1）；旧期标题/正文改动留到下次全量发布
#
# Run: bash scripts/deploy-release.sh [--dry-run] [--yes] [--only-new]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

DEPLOY_HOST="${DEPLOY_HOST:-root@161.35.120.114}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/cbb_vps}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-/opt/cbb/app/app}"
DEPLOY_FORCE="${DEPLOY_FORCE:-0}"
SKIP_FORCE="${DEPLOY_SKIP_FORCE:-0}"
ASSUME_YES="${DEPLOY_YES:-0}"
ONLY_NEW="${DEPLOY_ONLY_NEW:-0}"
DRY_RUN="${DEPLOY_DRY_RUN:-0}"

for arg in "$@"; do
  case "$arg" in
    --yes|-y)   ASSUME_YES=1 ;;
    --only-new) ONLY_NEW=1 ;;
    --dry-run)  DRY_RUN=1 ;;
    *) echo "未知参数：$arg（可用：--dry-run / --yes / --only-new）" >&2; exit 2 ;;
  esac
done

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

is_num() { case "$1" in ''|*[!0-9]*) return 1;; *) return 0;; esac; }

# --- Step 0 · plan: diff local seed content against the live DB, then confirm ---
PLAN_JSON="$(mktemp -t cbb-plan)"
DB_TSV="$(mktemp -t cbb-db)"
STAGE_DIR=""
RESTORED=0
NEWEST_LOCAL="$(python3 -c 'import json,sys; print(max(x["number"] for x in json.load(open(sys.argv[1]))))' "$APP_DIR/db/seed-content/issues.json" 2>/dev/null || echo '')"
# --only-new overwrites the VPS issues.json with a one-issue copy before seeding; put the
# full directory back afterwards, including on failure, so a bad run cannot leave it partial.
restore_full_content() {
  if [ "$ONLY_NEW" = "1" ] && [ -n "$STAGE_DIR" ] && [ "$RESTORED" = "0" ]; then
    log "== 恢复完整内容目录（不重新灌库）=="
    rsync_cmd "$APP_DIR/db/seed-content/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content/" || true
    rsync_cmd "$APP_DIR/db/seed-content-zh/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content-zh/" || true
    RESTORED=1
  fi
}
cleanup() { restore_full_content; rm -f "$PLAN_JSON" "$DB_TSV"; if [ -n "$STAGE_DIR" ]; then rm -rf "$STAGE_DIR"; fi; return 0; }
trap cleanup EXIT

log "== Step 1/7 · 变更清单（本地 seed 内容 vs 生产库）=="
if ! remote "mysql -u root cbb -N -B -e \"SELECT number, slug, title, MD5(content), IFNULL(MD5(contentZh),'NULL') FROM issues ORDER BY number\"" > "$DB_TSV"; then
  log "ERROR: 读取生产库失败，放弃发布。"
  exit 1
fi

set +e
python3 "$SCRIPT_DIR/deploy-plan.py" plan --app-dir "$APP_DIR" --db "$DB_TSV" --out "$PLAN_JSON"
PLAN_RC=$?
set -e

if [ "$PLAN_RC" -eq 2 ] && [ "$DEPLOY_FORCE" != "1" ]; then
  log "== 没有内容变更，跳过发布。仅代码/构建改动需要重发时用 DEPLOY_FORCE=1 =="
  exit 0
fi
if [ "$PLAN_RC" -ne 0 ] && [ "$PLAN_RC" -ne 2 ]; then
  log "ERROR: 变更清单生成失败（exit $PLAN_RC）"
  exit 1
fi

if [ "$ONLY_NEW" = "1" ]; then
  log "发布范围：仅新期（DEPLOY_ONLY_NEW=1）；旧期改动不灌库，留到下次全量发布"
else
  log "发布范围：全量（dist + 全部 seed 内容）"
fi

if [ "$DRY_RUN" = "1" ]; then
  log "== DRY RUN：以上为本次将同步的变更，未构建、未同步、未重启 =="
  exit 0
fi

if [ "$ASSUME_YES" = "1" ]; then
  log "已带 --yes / DEPLOY_YES=1，跳过确认。"
elif [ -t 0 ]; then
  printf '\n确认把以上变更发布到生产站？[y/N] '
  read -r reply || reply=""
  case "$reply" in
    y|Y|yes|YES) log "已确认，继续发布。" ;;
    *) log "已取消，未做任何部署。"; exit 1 ;;
  esac
else
  log "非交互式运行（launchd/cron），跳过确认。"
fi

log "== Step 2/7 · local build =="
( cd "$APP_DIR" && npm run build )

# Prefer the full GNU rsync (Homebrew) over Apple's openrsync (protocol 29, fewer flags).
# --partial keeps partially-transferred bytes so a dropped connection resumes instead of
# restarting; -c checksum-syncs (preserving -a semantics via --archive) so a truncated-but-
# same-size payload is still caught; --timeout aborts a stalled transfer instead of hanging.
if command -v /opt/homebrew/bin/rsync >/dev/null 2>&1; then
  RSYNC="${DEPLOY_RSYNC:-/opt/homebrew/bin/rsync}"
else
  RSYNC="${DEPLOY_RSYNC:-rsync}"
fi
rsync_cmd() { "$RSYNC" -az --partial -c --timeout=300 -e "ssh -i $DEPLOY_KEY -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=10 -o ServerAliveCountMax=3" "$@"; }

log "== Step 3/7 · push dist/ -> $DEPLOY_HOST:$DEPLOY_REMOTE/dist =="
remote "mkdir -p '$DEPLOY_REMOTE/dist'"
rsync_cmd "$APP_DIR/dist/" "$DEPLOY_HOST:$DEPLOY_REMOTE/dist/"

if [ "$ONLY_NEW" = "1" ]; then
  NEW_COUNT="$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["new"]))' "$PLAN_JSON")"
  if [ "$NEW_COUNT" = "0" ]; then
    log "== DEPLOY_ONLY_NEW=1 但没有新期，退出 =="
    exit 0
  fi
  STAGE_DIR="$(mktemp -d -t cbb-stage)"
  python3 "$SCRIPT_DIR/deploy-plan.py" stage --app-dir "$APP_DIR" --plan "$PLAN_JSON" --stage "$STAGE_DIR"
  log "== Step 4/7 · 仅推送新期内容 -> $DEPLOY_HOST:$DEPLOY_REMOTE/db =="
  remote "mkdir -p '$DEPLOY_REMOTE/db/seed-content' '$DEPLOY_REMOTE/db/seed-content-zh'"
  rsync_cmd "$STAGE_DIR/seed-content/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content/"
  rsync_cmd "$STAGE_DIR/seed-content-zh/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content-zh/"
else
  log "== Step 4/7 · push seed-content (+zh) -> $DEPLOY_HOST:$DEPLOY_REMOTE/db =="
  remote "mkdir -p '$DEPLOY_REMOTE/db/seed-content' '$DEPLOY_REMOTE/db/seed-content-zh'"
  rsync_cmd "$APP_DIR/db/seed-content/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content/"
  rsync_cmd "$APP_DIR/db/seed-content-zh/" "$DEPLOY_HOST:$DEPLOY_REMOTE/db/seed-content-zh/"
fi

log "== Step 5/7 · VPS 灌库（幂等 upsert）=="
remote "cd '$DEPLOY_REMOTE' && npm run db:seed"

if [ "$ONLY_NEW" = "1" ]; then
  PENDING="$(python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); print(len(p["title"])+len(p["body"]))' "$PLAN_JSON")"
  if [ "$PENDING" != "0" ]; then
    log "提示：$PENDING 项旧期改动本次未灌库，留到下次全量发布。"
  fi
  restore_full_content
fi

log "== Step 6/7 · chown www-data + restart cbb =="
remote "chown -R www-data:www-data '$DEPLOY_REMOTE/dist' '$DEPLOY_REMOTE/db' && systemctl restart cbb"

# Verify the deploy actually printed a running app.
log "== Step 7/7 · verify =="
sleep 5
HTTP_CODE="$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000")"
log "App HTTP status (VPS localhost:3000): $HTTP_CODE"
if [ "$HTTP_CODE" != "200" ]; then
  log "ERROR: app did not return 200 after restart (got $HTTP_CODE)"
  remote "journalctl -u cbb -n 30 --no-pager" 2>/dev/null | tail -30 || true
  exit 1
fi

# Post-seed sanity: DB max should now reach the local newest.
DB_MAX_AFTER="$(remote "mysql -u root cbb -N -e 'SELECT COALESCE(MAX(number),0) FROM issues'" 2>/dev/null || echo '')"
log "DB max after seed: $DB_MAX_AFTER (local newest: $NEWEST_LOCAL)"
if is_num "$NEWEST_LOCAL" && is_num "$DB_MAX_AFTER" && [ "$DB_MAX_AFTER" -lt "$NEWEST_LOCAL" ]; then
  log "WARNING: DB max ($DB_MAX_AFTER) still < local newest ($NEWEST_LOCAL) — seed did not fully apply."
fi

log "== Done. Release live on https://chinabatterybrief.com =="
