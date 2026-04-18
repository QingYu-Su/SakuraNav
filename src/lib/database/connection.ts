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
const DB_DIR = path.join(projectRoot, "storage", "database");
const DB_PATH = path.join(DB_DIR, "sakuranav.sqlite");

/** 全局数据库实例声明 */
declare global {
  var __sakuraDb: Database.Database | undefined;
}

/**
 * 迁移旧版数据库文件到新目录（storage/sakuranav.sqlite → storage/database/sakuranav.sqlite）
 */
function migrateLegacyDatabase(): void {
  const legacyDbPath = path.join(projectRoot, "storage", "sakuranav.sqlite");
  if (!fs.existsSync(legacyDbPath)) return;

  // 确保目标目录存在
  fs.mkdirSync(DB_DIR, { recursive: true });

  const newDbPath = DB_PATH;
  if (fs.existsSync(newDbPath)) {
    // 新位置已有数据库，删除旧文件即可
    fs.unlinkSync(legacyDbPath);
    logger.info("已清理旧版数据库文件", { legacyPath: legacyDbPath });
  } else {
    // 迁移主数据库文件及 WAL 相关文件
    for (const suffix of ["", "-shm", "-wal"]) {
      const src = `${legacyDbPath}${suffix}`;
      const dst = `${newDbPath}${suffix}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dst);
      }
    }
    logger.info("已迁移旧版数据库到新目录", { from: legacyDbPath, to: newDbPath });
  }
}

/**
 * 打开数据库连接并初始化
 * @returns 数据库实例
 */
function openAndInitializeDatabase(): Database.Database {
  // 首次启动时，尝试迁移旧版数据库文件
  migrateLegacyDatabase();

  fs.mkdirSync(DB_DIR, { recursive: true });
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
