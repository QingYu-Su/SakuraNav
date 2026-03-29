import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "storage", "sakuranav.sqlite");

declare global {
  var __sakuraDb: Database.Database | undefined;
}

function openDatabase(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb(): Database.Database {
  if (!global.__sakuraDb) {
    global.__sakuraDb = openDatabase();
  }
  return global.__sakuraDb;
}
