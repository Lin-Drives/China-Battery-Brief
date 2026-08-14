// Prints DB connection vars as shell-export lines (values single-quote escaped).
// Reads DATABASE_URL from the app .env via dotenv. Used by backup/restore.sh.
import "dotenv/config";

const u = new URL(process.env.DATABASE_URL);
const esc = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const rows = [
  ["DB_HOST", u.hostname],
  ["DB_PORT", u.port || "3306"],
  ["DB_USER", decodeURIComponent(u.username)],
  ["DB_PASS", u.password ? decodeURIComponent(u.password) : ""],
  ["DB_NAME", decodeURIComponent(u.pathname).replace("/", "")],
];
console.log(rows.map(([k, v]) => `export ${k}=${esc(v)}`).join("\n"));
