/**
 * @description PostgreSQL 适配器 - 使用 pg 库实现 DatabaseAdapter 接口
 */

import pg from "pg";
import type { DatabaseAdapter, Params, ExecuteResult } from "./adapter";
import { translateQuery, splitSqlStatements, translateSql } from "./sql-dialect";
import { getDatabaseConfig } from "@/lib/config/server-config";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("PostgreSQL");

export async function createPostgresqlAdapter(): Promise<DatabaseAdapter> {
  const config = getDatabaseConfig();
  const pgConfig = config.postgresql!;

  const pool = new pg.Pool({
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.database,
    user: pgConfig.user,
    password: pgConfig.password,
    max: 10,
  });

  const client = await pool.connect();
  client.release();
  logger.info("PostgreSQL 连接池已建立", { host: pgConfig.host, database: pgConfig.database });

  return new PostgresqlAdapter(pool);
}

class PostgresqlAdapter implements DatabaseAdapter {
  readonly type = "postgresql" as const;
  private pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async query<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T[]> {
    const { sql: translated, values } = translateQuery(sql, params, "postgresql");
    const result = await this.pool.query(translated, values);
    return result.rows as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params?: Params): Promise<ExecuteResult> {
    const { sql: translated, values } = translateQuery(sql, params, "postgresql");
    const result = await this.pool.query(translated, values);
    return { changes: result.rowCount ?? 0 };
  }

  async exec(sql: string): Promise<void> {
    const translated = translateSql(sql, "postgresql");
    const statements = splitSqlStatements(translated);
    const client = await this.pool.connect();
    try {
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } finally {
      client.release();
    }
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn();
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getTableColumns(tableName: string): Promise<string[]> {
    const rows = await this.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [tableName]
    );
    return rows.map((r) => r.column_name);
  }

  async hasTable(tableName: string): Promise<boolean> {
    const rows = await this.query<{ cnt: string }>(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [tableName]
    );
    return rows.length > 0 && Number(rows[0].cnt) > 0;
  }

  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const columns = await this.getTableColumns(tableName);
    return columns.includes(columnName);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
