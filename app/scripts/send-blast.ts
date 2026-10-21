import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { sendWeeklyBlast, pruneEmailSends } from "../api/lib/newsletter";
import { issues } from "../db/schema";
import { getDb, closeDb } from "../api/queries/connection";

/**
 * Weekly blast CLI (cron-friendly): sends the latest issue (or a specific
 * issue number, passed as $1) to every verified subscriber.
 *
 *   npm run email:blast            → latest published issue (concurrency 5)
 *   npm run email:blast -- 50      → issue number 50
 *   npm run email:blast -- 50 10   → issue 50 with 10 concurrent sends
 *   npm run email:blast -- 50 --dry-run → render only; no mail, no audit rows
 *
 * After the blast it opportunistically prunes old email_sends audit rows.
 * Requires DATABASE_URL (+ SMTP_* to actually send; otherwise log-mode).
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((arg) => arg !== "--dry-run");
  const arg = positional[0];
  const concurrencyArg = positional[1];
  const db = getDb();

  let issueId: number;
  if (arg) {
    const num = Number(arg);
    if (!Number.isInteger(num) || num <= 0) throw new Error(`Invalid issue number: ${arg}`);
    const row = (await db.select({ id: issues.id }).from(issues).where(eq(issues.number, num)))[0];
    if (!row) throw new Error(`No issue with number ${num}`);
    issueId = row.id;
  } else {
    const row = (
      await db
        .select({ id: issues.id })
        .from(issues)
        .orderBy(desc(issues.publishedAt))
        .limit(1)
    )[0];
    if (!row) throw new Error("No issues in the database");
    issueId = row.id;
  }

  const concurrency = concurrencyArg ? Number(concurrencyArg) : undefined;
  if (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency <= 0)) {
    throw new Error(`Invalid concurrency: ${concurrencyArg}`);
  }

  console.log(
    `${dryRun ? "Dry run" : "Blasting"} issue #${issueId}${concurrency ? ` (concurrency ${concurrency})` : ""}…`,
  );
  const summary = await sendWeeklyBlast(issueId, {
    ...(concurrency ? { concurrency } : {}),
    ...(dryRun ? { dryRun: true } : {}),
  });
  console.log(`Blast finished: ${JSON.stringify(summary)}`);

  if (!dryRun) {
    const pruned = await pruneEmailSends();
    console.log(`Pruned old email_sends: ${JSON.stringify(pruned)}`);
  }
}

main()
  .then(() => {
    closeDb(() => process.exit(0));
  })
  .catch((error) => {
    console.error("Blast failed:", error);
    closeDb(() => process.exit(1));
  });
