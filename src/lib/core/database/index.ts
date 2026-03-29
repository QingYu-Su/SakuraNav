/**
 * @description 数据库模块入口 - 统一导出数据库连接和初始化函数
 */

import { getDb } from "./connection";
import { initializeSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedDatabase } from "./seed";

/**
 * 初始化数据库（创建表结构、运行迁移、填充种子数据）
 */
export function initializeDatabase(): void {
  const db = getDb();
  initializeSchema(db);
  runMigrations(db);
  seedDatabase(db);
}

export { getDb } from "./connection";
