/**
 * @description 数据库连接 - 管理 SQLite 数据库连接，使用全局变量实现单例模式
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { initializeSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedDatabase } from "./seed";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("Database");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** 数据库文件路径 */
const DB_PATH = path.join(projectRoot, "storage", "sakuranav.sqlite");

/** 全局数据库实例声明 */
declare global {
  var __sakuraDb: Database.Database | undefined;
}

/**
 * 打开数据库连接并初始化
 * @returns 数据库实例
 */
function openAndInitializeDatabase(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeSchema(db);
  runMigrations(db);
  seedDatabase(db);

  logger.info("数据库初始化完成");
  return db;
}

/**
 * 获取数据库实例（单例模式）
 * @returns 数据库实例
 */
export function getDb(): Database.Database {
  if (!global.__sakuraDb) {
    global.__sakuraDb = openAndInitializeDatabase();
  }
  return global.__sakuraDb;
}
