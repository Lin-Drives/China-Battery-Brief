import "dotenv/config";
import { sendTestEmail } from "../api/lib/newsletter";
import { getDb, closeDb } from "../api/queries/connection";

/**
 * Send a single test email to verify the SMTP channel is configured and can
 * deliver (esp. to Chinese domestic boxes — check it lands / not in spam).
 *
 *   npm run email:test -- you@example.com
 */
async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run email:test -- <recipient@example.com>");
    process.exit(1);
  }
  const result = await sendTestEmail(to);
  console.log(result.sent ? `Test email sent to ${to}` : `Test send skipped/failed: ${result.error ?? "no SMTP configured (log-mode)"}`);
}

getDb(); // open the connection so closeDb can tear it down below
main()
  .then(() => {
    closeDb(() => process.exit(0));
  })
  .catch((error) => {
    console.error("Test failed:", error);
    closeDb(() => process.exit(1));
  });
