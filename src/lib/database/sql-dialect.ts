/**
 * @description SQL 方言转换工具 - 处理 SQLite → MySQL/PostgreSQL 的 SQL 语法差异
 */

/** UPSERT 冲突列映射：指定各表在 INSERT OR REPLACE 时应使用的冲突列（主键/唯一约束列） */
const UPSERT_CONFLICT_COLUMNS: Record<string, string[]> = {
  app_settings: ["key"],
  theme_appearances: ["owner_id", "theme"],
};

/** @named 参数的正则 */
const NAMED_PARAM_RE = /@(\w+)/g;

/**
 * 将 SQL 中的 @named 参数按数据库方言转换为对应占位符
 * - SQLite: 保持 @param（better-sqlite3 原生支持）
 * - MySQL: 转为 ? 并按出现顺序提取值
 * - PostgreSQL: 转为 $1, $2... 并按出现顺序提取值
 */
export function translateNamedParams(
  sql: string,
  params: Record<string, unknown>,
  dialect: "sqlite" | "mysql" | "postgresql"
): { sql: string; values: unknown[] } {
  if (dialect === "sqlite") {
    return { sql, values: [] };
  }

  const values: unknown[] = [];
  const placeholderMap = new Map<string, string>();
  let paramIndex = 1;

  const translatedSql = sql.replace(NAMED_PARAM_RE, (_match, name: string) => {
    if (!placeholderMap.has(name)) {
      values.push(params[name]);
      if (dialect === "mysql") {
        placeholderMap.set(name, "?");
      } else {
        placeholderMap.set(name, `$${paramIndex++}`);
      }
    }
    return placeholderMap.get(name)!;
  });

  return { sql: translatedSql, values };
}

/**
 * 将位置参数（?）转换为 PostgreSQL 的 $1, $2... 格式
 */
export function translatePositionalParams(
  sql: string,
  dialect: "sqlite" | "mysql" | "postgresql"
): string {
  if (dialect !== "postgresql") return sql;

  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * 转换 INSERT OR REPLACE 语句
 * - SQLite: 透传
 * - MySQL: REPLACE INTO
 * - PostgreSQL: INSERT ... ON CONFLICT ... DO UPDATE SET ...
 */
export function translateInsertOrReplace(
  sql: string,
  dialect: "sqlite" | "mysql" | "postgresql"
): string {
  if (dialect === "sqlite") return sql;

  const match = sql.match(
    /INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
  );
  if (!match) {
    if (dialect === "mysql") {
      return sql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, "REPLACE INTO");
    }
    return sql;
  }

  const [, tableName, columnsStr] = match;
  const columns = columnsStr.split(",").map((c) => c.trim());

  if (dialect === "mysql") {
    return sql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, "REPLACE INTO");
  }

  // PostgreSQL
  const conflictColumns = UPSERT_CONFLICT_COLUMNS[tableName];
  if (!conflictColumns) {
    return sql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, "INSERT INTO").replace(
      /\)\s*$/,
      ") ON CONFLICT DO NOTHING"
    );
  }

  const nonConflictColumns = columns.filter((c) => !conflictColumns.includes(c));
  const updateSet = nonConflictColumns
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");

  const baseInsert = sql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, "INSERT INTO");
  if (updateSet) {
    return baseInsert.replace(
      /\)\s*$/,
      `) ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ${updateSet}`
    );
  }
  return baseInsert.replace(
    /\)\s*$/,
    `) ON CONFLICT (${conflictColumns.join(", ")}) DO NOTHING`
  );
}

/**
 * 转换 INSERT OR IGNORE 语句
 * - SQLite: 透传
 * - MySQL: INSERT IGNORE INTO
 * - PostgreSQL: INSERT INTO ... ON CONFLICT DO NOTHING
 */
export function translateInsertOrIgnore(
  sql: string,
  dialect: "sqlite" | "mysql" | "postgresql"
): string {
  if (dialect === "sqlite") return sql;
  if (dialect === "mysql") {
    return sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT IGNORE INTO");
  }
  return sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT INTO").replace(
    /\)\s*$/,
    ") ON CONFLICT DO NOTHING"
  );
}

/**
 * 对 SQL 语句进行完整的方言转换
 */
export function translateSql(
  sql: string,
  dialect: "sqlite" | "mysql" | "postgresql"
): string {
  if (dialect === "sqlite") return sql;

  let result = sql;

  if (/INSERT\s+OR\s+REPLACE/i.test(result)) {
    result = translateInsertOrReplace(result, dialect);
  }

  if (/INSERT\s+OR\s+IGNORE/i.test(result)) {
    result = translateInsertOrIgnore(result, dialect);
  }

  return result;
}

/**
 * 处理参数和 SQL 转换（组合 translateSql + translateNamedParams + translatePositionalParams）
 */
export function translateQuery(
  sql: string,
  params: unknown[] | Record<string, unknown> | undefined,
  dialect: "sqlite" | "mysql" | "postgresql"
): { sql: string; values: unknown[] } {
  let translatedSql = translateSql(sql, dialect);

  if (!params) {
    if (dialect === "postgresql" && translatedSql.includes("?")) {
      translatedSql = translatePositionalParams(translatedSql, dialect);
    }
    return { sql: translatedSql, values: [] };
  }

  if (Array.isArray(params)) {
    if (dialect === "postgresql" && translatedSql.includes("?")) {
      translatedSql = translatePositionalParams(translatedSql, dialect);
    }
    return { sql: translatedSql, values: params };
  }

  // 命名参数对象
  const result = translateNamedParams(translatedSql, params, dialect);
  if (dialect === "postgresql" && result.sql.includes("?")) {
    result.sql = translatePositionalParams(result.sql, dialect);
  }
  return result;
}

/**
 * 拆分多语句 SQL（用于 exec）
 * PostgreSQL 不支持多语句，需拆分为单条逐个执行
 */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
