/**
 * @description 数据库连接 - 根据配置创建对应的数据库适配器，全局单例模式
 */

import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { initializeSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedDatabase } from "./seed";
import { createLogger } from "@/lib/base/logger";
import type { DatabaseAdapter } from "./adapter";
import { SqliteAdapter } from "./sqlite-adapter";
import { getDatabaseConfig } from "@/lib/config/server-config";

const logger = createLogger("Database");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** SQLite 数据库文件路径 */
const SQLITE_DIR = path.join(projectRoot, "storage", "database");
const SQLITE_PATH = path.join(SQLITE_DIR, "sakuranav.sqlite");

/** 全局适配器实例声明 */
declare global {
  var __sakuraDbAdapter: DatabaseAdapter | undefined;
  var __sakuraDbType: string | undefined;
  var __sakuraDbInitPromise: Promise<DatabaseAdapter> | undefined;
}

/**
 * 迁移旧版 SQLite 数据库文件到新目录（storage/sakuranav.sqlite → storage/database/sakuranav.sqlite）
 */
function migrateLegacySqliteDatabase(): void {
  const legacyDbPath = path.join(projectRoot, "storage", "sakuranav.sqlite");
  if (!fs.existsSync(legacyDbPath)) return;

  fs.mkdirSync(SQLITE_DIR, { recursive: true });

  if (fs.existsSync(SQLITE_PATH)) {
    fs.unlinkSync(legacyDbPath);
    logger.info("已清理旧版数据库文件", { legacyPath: legacyDbPath });
  } else {
    for (const suffix of ["", "-shm", "-wal"]) {
      const src = `${legacyDbPath}${suffix}`;
      const dst = `${SQLITE_PATH}${suffix}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dst);
      }
    }
    logger.info("已迁移旧版数据库到新目录", { from: legacyDbPath, to: SQLITE_PATH });
  }
}

/**
 * 创建 SQLite 适配器并初始化
 */
async function createSqliteAdapter(): Promise<DatabaseAdapter> {
  migrateLegacySqliteDatabase();

  fs.mkdirSync(SQLITE_DIR, { recursive: true });
  const db = new Database(SQLITE_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const adapter = new SqliteAdapter(db);

  await initializeSchema(adapter);
  await runMigrations(adapter);
  await seedDatabase(adapter);

  logger.info("SQLite 数据库初始化完成");
  return adapter;
}

/**
 * 创建 MySQL 适配器并初始化
 */
async function createMysqlAdapter(): Promise<DatabaseAdapter> {
  const { createMysqlAdapter: createMysql } = await import("./mysql-adapter");
  const adapter = await createMysql();

  await initializeSchema(adapter);
  await runMigrations(adapter);
  await seedDatabase(adapter);

  logger.info("MySQL 数据库初始化完成");
  return adapter;
}

/**
 * 创建 PostgreSQL 适配器并初始化
 */
async function createPostgresqlAdapter(): Promise<DatabaseAdapter> {
  const { createPostgresqlAdapter: createPg } = await import("./postgresql-adapter");
  const adapter = await createPg();

  await initializeSchema(adapter);
  await runMigrations(adapter);
  await seedDatabase(adapter);

  logger.info("PostgreSQL 数据库初始化完成");
  return adapter;
}

/**
 * 创建并初始化数据库适配器
 */
async function createAndInitializeAdapter(): Promise<DatabaseAdapter> {
  const dbConfig = getDatabaseConfig();
  const dbType = dbConfig.type;

  logger.info(`正在初始化 ${dbType} 数据库...`);

  switch (dbType) {
    case "sqlite":
      return createSqliteAdapter();
    case "mysql":
      return createMysqlAdapter();
    case "postgresql":
      return createPostgresqlAdapter();
    default:
      throw new Error(`不支持的数据库类型: ${dbType}`);
  }
}

/**
 * 获取数据库适配器实例（单例模式）
 * 首次调用时根据 config.yml 中的 database.type 创建对应适配器
 * 如果配置的数据库类型发生变化，关闭旧连接并创建新适配器
 */
export async function getDb(): Promise<DatabaseAdapter> {
  const dbConfig = getDatabaseConfig();
  const dbType = dbConfig.type;

  // 已初始化且类型匹配，直接返回
  if (global.__sakuraDbAdapter && global.__sakuraDbType === dbType) {
    return global.__sakuraDbAdapter;
  }

  // 正在初始化中（并发请求去重），等待同一个 promise
  if (global.__sakuraDbInitPromise && global.__sakuraDbType === dbType) {
    return global.__sakuraDbInitPromise;
  }

  // 类型变化：关闭旧连接
  if (global.__sakuraDbAdapter) {
    try {
      await global.__sakuraDbAdapter.close();
      logger.info(`已关闭 ${global.__sakuraDbType} 数据库连接`);
    } catch {
      // 忽略关闭错误
    }
    global.__sakuraDbAdapter = undefined;
  }

  // 创建新适配器（用 promise 去重并发调用）
  global.__sakuraDbType = dbType;
  global.__sakuraDbInitPromise = createAndInitializeAdapter().then((adapter) => {
    global.__sakuraDbAdapter = adapter;
    return adapter;
  }).finally(() => {
    global.__sakuraDbInitPromise = undefined;
  });

  return global.__sakuraDbInitPromise;
}

/**
 * 重置数据库连接
 * 关闭当前连接并清除单例，下次调用 getDb() 会重新初始化
 */
export async function resetDbConnection(): Promise<void> {
  if (global.__sakuraDbAdapter) {
    try {
      await global.__sakuraDbAdapter.close();
    } catch {
      // 忽略关闭错误
    }
    global.__sakuraDbAdapter = undefined;
    global.__sakuraDbType = undefined;
  }
}
