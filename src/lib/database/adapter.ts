/**
 * @description 数据库适配器接口 - 统一 SQLite/MySQL/PostgreSQL 的数据库操作 API
 */

/** 参数类型：支持位置参数数组或命名参数对象 */
export type Params = unknown[] | Record<string, unknown>;

/** 执行结果 */
export interface ExecuteResult {
  /** 受影响的行数 */
  changes: number;
}

/**
 * 数据库适配器接口
 * 所有数据库驱动（SQLite/MySQL/PostgreSQL）均实现此接口
 */
export interface DatabaseAdapter {
  /** 数据库类型标识 */
  readonly type: "sqlite" | "mysql" | "postgresql";

  /**
   * 执行查询并返回所有结果行
   * @param sql SQL 语句
   * @param params 参数（位置参数数组或命名参数对象）
   */
  query<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T[]>;

  /**
   * 执行查询并返回第一行，无结果时返回 null
   */
  queryOne<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T | null>;

  /**
   * 执行写操作（INSERT/UPDATE/DELETE），返回受影响行数
   */
  execute(sql: string, params?: Params): Promise<ExecuteResult>;

  /**
   * 执行原始 SQL（DDL 等），无返回值
   * 支持多语句分号分隔（适配器内部处理方言差异）
   */
  exec(sql: string): Promise<void>;

  /**
   * 在事务中执行操作
   * @param fn 事务体，其中所有数据库操作具有原子性
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * 获取表的所有列名
   */
  getTableColumns(tableName: string): Promise<string[]>;

  /**
   * 检查表是否存在
   */
  hasTable(tableName: string): Promise<boolean>;

  /**
   * 检查表中是否存在指定列
   */
  hasColumn(tableName: string, columnName: string): Promise<boolean>;

  /**
   * 关闭数据库连接
   */
  close(): Promise<void>;
}
