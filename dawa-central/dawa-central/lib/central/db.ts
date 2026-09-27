import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DB_FILE = process.env.DAWA_DB ?? path.join(process.cwd(), "data", "dawa.db");

const g = globalThis as unknown as { __dawaDb?: Database.Database };

export function db(): Database.Database {
  if (!g.__dawaDb) {
    if (!fs.existsSync(DB_FILE)) throw new Error(`Database not found at ${DB_FILE}. Run "npm run db:seed" then "npm run ml".`);
    const conn = new Database(DB_FILE);
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    conn.pragma("busy_timeout = 5000");
    g.__dawaDb = conn;
  }
  return g.__dawaDb;
}
