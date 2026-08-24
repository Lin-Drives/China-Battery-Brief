import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    instance = drizzle(env.databaseUrl, {
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance;
}

/**
 * Tear down the underlying MySQL client so a CLI script (blast / prune / test)
 * can let the event loop drain and exit instead of hanging on an open pool.
 * Safe no-op when the DB was never initialised in this process.
 */
export function closeDb(done?: () => void): void {
  const client = (instance as { $client?: { end?: (cb?: () => void) => void } } | undefined)?.$client;
  if (client?.end) {
    client.end(done);
  } else {
    done?.();
  }
}
