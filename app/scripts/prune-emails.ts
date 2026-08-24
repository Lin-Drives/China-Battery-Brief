import "dotenv/config";
import { pruneEmailSends } from "../api/lib/newsletter";
import { getDb, closeDb } from "../api/queries/connection";

/**
 * Prune old email_sends audit rows (retention in days, $1; default 180).
 * Cron-friendly — see plan.md. Keeps the sends log from growing forever.
 *
 *   npm run email:prune             → delete rows older than 180 days
 *   npm run email:prune -- 90       → delete rows older than 90 days
 */
async function main() {
  const arg = process.argv[2];
  const retention = arg ? Number(arg) : undefined;
  if (retention !== undefined && (!Number.isInteger(retention) || retention <= 0)) {
    console.error(`Invalid retention days: ${arg}`);
    process.exit(1);
  }
  const result = await pruneEmailSends(retention);
  console.log(`Pruned ${result.deleted} email_sends row(s)${retention ? ` (retention ${retention}d)` : ""}`);
}

getDb(); // open the connection so closeDb can tear it down below
main()
  .then(() => {
    closeDb(() => process.exit(0));
  })
  .catch((error) => {
    console.error("Prune failed:", error);
    closeDb(() => process.exit(1));
  });
