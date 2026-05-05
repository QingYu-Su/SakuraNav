/**
 * @description 数据库模块入口 - 统一导出数据库适配器连接函数
 */

export { getDb, resetDbConnection } from "./connection";
export type { DatabaseAdapter, Params, ExecuteResult } from "./adapter";
