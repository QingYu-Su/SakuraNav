/**
 * @description 数据库连接 - 管理 SQLite 数据库连接，使用全局变量实现单例模式
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/** 数据库文件路径 */
const DB_PATH = path.join(process.cwd(), "storage", "sakuranav.sqlite");

/** 全局数据库实例声明 */
declare global {
  var __sakuraDb: Database.Database | undefined;
}

/**
 * 打开数据库连接
 * @returns 数据库实例
 */
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
