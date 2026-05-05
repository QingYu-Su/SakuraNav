/**
 * @description SQLite 适配器 - 将 better-sqlite3 的同步 API 包装为异步 DatabaseAdapter 接口
 * 使用 Mutex 互斥锁保证所有数据库操作串行执行，避免 async 并发导致 SQLITE_BUSY
 * 事务内部的操作跳过锁获取（重入安全）
 */

import Database from "better-sqlite3";
import type { DatabaseAdapter, Params, ExecuteResult } from "./adapter";
import { translateSql } from "./sql-dialect";

/**
 * 简单的互斥锁 — 确保 async 环境下 SQLite 操作串行执行
 */
class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.locked = false;
    const next = this.queue.shift();
    if (next) next();
  }
}

export class SqliteAdapter implements DatabaseAdapter {
  readonly type = "sqlite" as const;
  private db: Database.Database;
  private mutex = new Mutex();
  /** 事务内重入计数：事务持有锁后，内部操作跳过锁获取 */
  private transactionDepth = 0;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /** 获取锁（事务内跳过） */
  private async acquire(): Promise<() => void> {
    if (this.transactionDepth > 0) {
      return () => {};
    }
    return this.mutex.acquire();
  }

  async query<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T[]> {
    const release = await this.acquire();
    try {
      const translated = translateSql(sql, "sqlite");
      const stmt = this.db.prepare(translated);
      const rows = params !== undefined ? stmt.all(params as Record<string, unknown>) : stmt.all();
      return rows as T[];
    } finally {
      release();
    }
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T | null> {
    const release = await this.acquire();
    try {
      const translated = translateSql(sql, "sqlite");
      const stmt = this.db.prepare(translated);
      const row = params !== undefined ? stmt.get(params as Record<string, unknown>) : stmt.get();
      return (row ?? null) as T | null;
    } finally {
      release();
    }
  }

  async execute(sql: string, params?: Params): Promise<ExecuteResult> {
    const release = await this.acquire();
    try {
      const translated = translateSql(sql, "sqlite");
      const stmt = this.db.prepare(translated);
      const info = params !== undefined ? stmt.run(params as Record<string, unknown>) : stmt.run();
      return { changes: info.changes };
    } finally {
      release();
    }
  }

  async exec(sql: string): Promise<void> {
    const release = await this.acquire();
    try {
      const translated = translateSql(sql, "sqlite");
      this.db.exec(translated);
    } finally {
      release();
    }
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.mutex.acquire();
    this.transactionDepth++;
    try {
      this.db.exec("BEGIN");
      const result = await fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* ignore */ }
      throw error;
    } finally {
      this.transactionDepth--;
      release();
    }
  }

  async getTableColumns(tableName: string): Promise<string[]> {
    const release = await this.acquire();
    try {
      const columns = this.db.pragma(`table_info(${tableName})`) as Array<{ name: string }>;
      return columns.map((c) => c.name);
    } finally {
      release();
    }
  }

  async hasTable(tableName: string): Promise<boolean> {
    const release = await this.acquire();
    try {
      const result = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);
      return !!result;
    } finally {
      release();
    }
  }

  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const columns = await this.getTableColumns(tableName);
    return columns.includes(columnName);
  }

  async close(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.db.close();
    } finally {
      release();
    }
  }

  /** 获取底层的 better-sqlite3 实例（用于 db.pragma 等特殊场景） */
  get raw(): Database.Database {
    return this.db;
  }
}
