#!/bin/bash
# Weekly newsletter blast with guards (cron: 06:00 UTC every Thursday).
#
# Safety properties:
#   - flock prevents overlapping runs
#   - refuses to run when the root filesystem is nearly full
#   - only sends the newest issue whose publishedAt is due
#   - skips when that issue already has successful weekly sends
#   - caps Node heap and lowers CPU priority on a small VPS
#
# DRY_RUN=1 prints the decision without sending.
set -u

cd /opt/cbb/app/app || exit 1

LOG_PREFIX="[$(date -u '+%F %T UTC')]"
DRY_RUN="${DRY_RUN:-0}"
MIN_FREE_KB=524288 # 512 MB

# 1) One blast at a time.
LOCK=/tmp/cbb-weekly-blast.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$LOG_PREFIX another blast is running; skip"
  exit 0
fi

# 2) Leave headroom for MySQL and the web process.
AVAIL_KB=$(df -Pk / | awk 'NR==2 {print $4}')
if [ "${AVAIL_KB:-0}" -lt "$MIN_FREE_KB" ]; then
  echo "$LOG_PREFIX low disk: ${AVAIL_KB}KB free; abort"
  exit 1
fi

# 3) Newest issue that is due (5-minute grace for clock skew).
ISSUE=$(mysql -u root cbb -N -e \
  "SELECT number FROM issues WHERE publishedAt <= UTC_TIMESTAMP() + INTERVAL 5 MINUTE ORDER BY number DESC LIMIT 1" \
  2>/dev/null)
if ! [[ "${ISSUE:-}" =~ ^[0-9]+$ ]]; then
  echo "$LOG_PREFIX no due issue; skip"
  exit 0
fi

# 4) Never send the same issue twice.
SENT=$(mysql -u root cbb -N -e \
  "SELECT COUNT(*) FROM email_sends WHERE issueId=${ISSUE} AND kind='weekly' AND status='sent'" \
  2>/dev/null)
if [ "${SENT:-0}" -gt 0 ]; then
  echo "$LOG_PREFIX issue ${ISSUE} already sent (${SENT} successful); skip"
  exit 0
fi

echo "$LOG_PREFIX issue=${ISSUE} due · free=${AVAIL_KB}KB · dry_run=${DRY_RUN}"
if [ "$DRY_RUN" = "1" ]; then
  echo "$LOG_PREFIX dry run; no mail sent"
  exit 0
fi

# 5) Send from the bundled CLI (no tsx, no source tree needed).
if [ ! -f dist/send-blast.js ]; then
  echo "$LOG_PREFIX dist/send-blast.js missing; abort"
  exit 1
fi
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=128}" \
  nice -n 10 /usr/bin/node dist/send-blast.js "$ISSUE"
STATUS=$?
echo "$LOG_PREFIX blast exit=${STATUS}"
exit "$STATUS"
