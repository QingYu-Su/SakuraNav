/**
 * @description MySQL 适配器 - 使用 mysql2/promise 实现 DatabaseAdapter 接口
 */

import mysql from "mysql2/promise";
import type { DatabaseAdapter, Params, ExecuteResult } from "./adapter";
import { translateQuery, splitSqlStatements, translateSql } from "./sql-dialect";
import { getDatabaseConfig } from "@/lib/config/server-config";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MySQL");

export async function createMysqlAdapter(): Promise<DatabaseAdapter> {
  const config = getDatabaseConfig();
  const mysqlConfig = config.mysql!;

  const pool = mysql.createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    database: mysqlConfig.database,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    waitForConnections: true,
    connectionLimit: 10,
  });

  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  logger.info("MySQL 连接池已建立", { host: mysqlConfig.host, database: mysqlConfig.database });

  return new MysqlAdapter(pool);
}

class MysqlAdapter implements DatabaseAdapter {
  readonly type = "mysql" as const;
  private pool: mysql.Pool;

  constructor(pool: mysql.Pool) {
    this.pool = pool;
  }

  async query<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T[]> {
    const { sql: translated, values } = translateQuery(sql, params, "mysql");
    const [rows] = await this.pool.execute(translated, values as mysql.ExecuteValues[]);
    return rows as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params?: Params): Promise<ExecuteResult> {
    const { sql: translated, values } = translateQuery(sql, params, "mysql");
    const [result] = await this.pool.execute(translated, values as mysql.ExecuteValues[]);
    return { changes: (result as mysql.ResultSetHeader).affectedRows };
  }

  async exec(sql: string): Promise<void> {
    const translated = translateSql(sql, "mysql");
    const statements = splitSqlStatements(translated);
    const conn = await this.pool.getConnection();
    try {
      for (const stmt of statements) {
        await conn.execute(stmt);
      }
    } finally {
      conn.release();
    }
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn();
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getTableColumns(tableName: string): Promise<string[]> {
    const rows = await this.query<{ column_name: string }>(
      "SELECT COLUMN_NAME AS column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [tableName]
    );
    return rows.map((r) => r.column_name.toLowerCase());
  }

  async hasTable(tableName: string): Promise<boolean> {
    const rows = await this.query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [tableName]
    );
    return rows.length > 0 && rows[0].cnt > 0;
  }

  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const columns = await this.getTableColumns(tableName);
    return columns.includes(columnName);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
