/**
 * 快照数据仓库
 * @description 管理导航站数据快照的 CRUD 操作
 * 快照在用户退出编辑模式或刷新页面时自动创建，用于版本回退
 */

import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("SnapshotRepository");

/** 快照数据库行类型 */
type SnapshotRow = {
  id: string;
  owner_id: string;
  label: string;
  data: string;
  created_at: string;
};

/** 快照元信息（不含 data，用于列表展示） */
export type SnapshotMeta = {
  id: string;
  ownerId: string;
  label: string;
  createdAt: string;
};

/** 快照完整数据结构（存储在 data 字段中的 JSON） */
export type SnapshotData = {
  tags: Record<string, unknown>[];
  sites: Record<string, unknown>[];
  siteTags: Record<string, unknown>[];
  themeAppearances: Record<string, unknown>[];
  appSettings: Record<string, unknown>[];
  siteRelations: Record<string, unknown>[];
  floatingButtons: Record<string, unknown>[];
  exportedAt: string;
};

/** 快照保存时排除的列（同数据可移植服务的隐私保护策略） */
const SNAPSHOT_EXCLUDE_COLUMNS = new Set([
  "owner_id",
  "is_online",
  "online_check_last_run",
  "online_check_fail_count",
  "search_text",
  "pending_context_gen",
  "pending_ai_analysis",
]);

/** 导出时排除的 app_settings 键 */
const EXCLUDED_SETTINGS_KEYS = new Set([
  "ai_api_key",
  "ai_base_url",
  "ai_model",
  "admin_nickname",
  "admin_avatar_asset_id",
  "oauth_base_url",
  "oauth_providers",
  "registration_enabled",
]);

/** 快照最大保存天数 */
const SNAPSHOT_MAX_AGE_DAYS = 30;

// ── 读取 ──

/** 获取指定用户的所有快照元信息（按创建时间倒序） */
export function getSnapshotMetas(ownerId: string): SnapshotMeta[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id, owner_id, label, created_at FROM snapshots WHERE owner_id = ? ORDER BY created_at DESC",
  ).all(ownerId) as SnapshotRow[];
  return rows.map((r) => ({
    id: r.id,
    ownerId: r.owner_id,
    label: r.label,
    createdAt: r.created_at,
  }));
}

/** 获取单个快照的完整数据 */
export function getSnapshotById(id: string, ownerId: string): (SnapshotMeta & { data: SnapshotData }) | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT id, owner_id, label, data, created_at FROM snapshots WHERE id = ? AND owner_id = ?",
  ).get(id, ownerId) as SnapshotRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    label: row.label,
    createdAt: row.created_at,
    data: JSON.parse(row.data) as SnapshotData,
  };
}

/** 获取快照总数 */
export function getSnapshotCount(ownerId: string): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM snapshots WHERE owner_id = ?").get(ownerId) as { cnt: number };
  return row.cnt;
}

// ── 创建 ──

/** 采集当前数据库中的导航数据并创建快照 */
export function createSnapshot(ownerId: string, label: string): SnapshotMeta {
  const db = getDb();
  const data = collectSnapshotData(db, ownerId);
  const id = `snap-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO snapshots (id, owner_id, label, data, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, ownerId, label, JSON.stringify(data), now);

  // 创建后顺便清理过期快照
  cleanupExpiredSnapshots();

  logger.info(`快照已创建: ${id} (${label})`);
  return { id, ownerId, label, createdAt: now };
}

/**
 * 采集快照数据：读取当前用户的标签、站点、外观等（排除隐私和运行时状态字段）
 */
function collectSnapshotData(db: ReturnType<typeof getDb>, ownerId: string): SnapshotData {
  return {
    tags: collectTable(db, "tags", "owner_id = ?", [ownerId]),
    sites: collectTable(db, "sites", "owner_id = ?", [ownerId]),
    siteTags: collectSiteTagsForOwner(db, ownerId),
    themeAppearances: collectTable(db, "theme_appearances", "owner_id = ?", [ownerId]),
    appSettings: collectFilteredAppSettings(db),
    siteRelations: collectSiteRelationsForOwner(db, ownerId),
    floatingButtons: collectTable(db, "app_settings", "key = 'floating_buttons'", []),
    exportedAt: new Date().toISOString(),
  };
}

/** 通用表数据采集（排除敏感列） */
function collectTable(
  db: ReturnType<typeof getDb>,
  tableName: string,
  whereClause: string,
  params: unknown[],
): Record<string, unknown>[] {
  const columns = getTableColumns(db, tableName);
  const filteredColumns = columns.filter((c) => !SNAPSHOT_EXCLUDE_COLUMNS.has(c));
  const colList = filteredColumns.map((c) => `"${c}"`).join(", ");
  const rows = db.prepare(`SELECT ${colList} FROM ${tableName} WHERE ${whereClause}`).all(...params) as Record<string, unknown>[];
  return rows;
}

/** 获取表的所有列名 */
function getTableColumns(db: ReturnType<typeof getDb>, tableName: string): string[] {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return info.map((c) => c.name);
}

/** 采集 site_tags（通过 owner_id 关联 sites 过滤） */
function collectSiteTagsForOwner(db: ReturnType<typeof getDb>, ownerId: string): Record<string, unknown>[] {
  return db.prepare(
    "SELECT st.site_id, st.tag_id, st.sort_order FROM site_tags st INNER JOIN sites s ON st.site_id = s.id WHERE s.owner_id = ?",
  ).all(ownerId) as Record<string, unknown>[];
}

/** 采集 site_relations（通过 owner_id 关联 sites 过滤） */
function collectSiteRelationsForOwner(db: ReturnType<typeof getDb>, ownerId: string): Record<string, unknown>[] {
  return db.prepare(
    "SELECT r.id, r.source_site_id, r.target_site_id, r.sort_order, r.is_enabled, r.is_locked, r.source, r.reason, r.created_at FROM site_relations r INNER JOIN sites s ON r.source_site_id = s.id WHERE s.owner_id = ?",
  ).all(ownerId) as Record<string, unknown>[];
}

/** 采集 app_settings（排除敏感配置） */
function collectFilteredAppSettings(db: ReturnType<typeof getDb>): Record<string, unknown>[] {
  const rows = db.prepare("SELECT key, value FROM app_settings").all() as Array<{ key: string; value: string | null }>;
  return rows
    .filter((r) => !EXCLUDED_SETTINGS_KEYS.has(r.key))
    .map((r) => ({ key: r.key, value: r.value }));
}

// ── 删除 ──

/** 重命名快照 */
export function renameSnapshot(id: string, ownerId: string, label: string): boolean {
  const db = getDb();
  const result = db.prepare("UPDATE snapshots SET label = ? WHERE id = ? AND owner_id = ?").run(label, id, ownerId);
  if (result.changes > 0) {
    logger.info(`快照已重命名: ${id} → ${label}`);
    return true;
  }
  return false;
}

/** 删除单个快照 */
export function deleteSnapshot(id: string, ownerId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM snapshots WHERE id = ? AND owner_id = ?").run(id, ownerId);
  if (result.changes > 0) {
    logger.info(`快照已删除: ${id}`);
    return true;
  }
  return false;
}

/** 删除指定时间之后的所有快照（恢复快照时使用） */
export function deleteSnapshotsAfter(ownerId: string, snapshotId: string): number {
  const db = getDb();
  // 先找到目标快照的创建时间
  const target = db.prepare("SELECT created_at FROM snapshots WHERE id = ? AND owner_id = ?").get(snapshotId, ownerId) as { created_at: string } | undefined;
  if (!target) return 0;
  const result = db.prepare("DELETE FROM snapshots WHERE owner_id = ? AND created_at > ?").run(ownerId, target.created_at);
  if (result.changes > 0) {
    logger.info(`已删除 ${result.changes} 个在快照 ${snapshotId} 之后的快照`);
  }
  return result.changes;
}

/** 清理过期快照（超过 30 天） */
export function cleanupExpiredSnapshots(): number {
  const db = getDb();
  const cutoff = new Date(Date.now() - SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare("DELETE FROM snapshots WHERE created_at < ?").run(cutoff);
  if (result.changes > 0) {
    logger.info(`已清理 ${result.changes} 个过期快照（早于 ${cutoff}）`);
  }
  return result.changes;
}

// ── 恢复 ──

/**
 * 从快照恢复数据
 * @description 清空当前用户数据并替换为快照内容，然后删除该快照之后的所有快照
 */
export function restoreFromSnapshot(id: string, ownerId: string): boolean {
  const db = getDb();
  const snapshot = getSnapshotById(id, ownerId);
  if (!snapshot) return false;

  const data = snapshot.data;

  // 使用事务确保原子性
  const transaction = db.transaction(() => {
    // 1. 删除当前用户的 site_tags（通过 sites 关联）
    db.prepare(
      "DELETE FROM site_tags WHERE site_id IN (SELECT id FROM sites WHERE owner_id = ?)",
    ).run(ownerId);

    // 2. 删除当前用户的 site_relations
    db.prepare(
      "DELETE FROM site_relations WHERE source_site_id IN (SELECT id FROM sites WHERE owner_id = ?)",
    ).run(ownerId);

    // 3. 删除当前用户的 sites
    db.prepare("DELETE FROM sites WHERE owner_id = ?").run(ownerId);

    // 4. 删除当前用户的 tags
    db.prepare("DELETE FROM tags WHERE owner_id = ?").run(ownerId);

    // 5. 删除当前用户的 theme_appearances
    db.prepare("DELETE FROM theme_appearances WHERE owner_id = ?").run(ownerId);

    // 6. 恢复 tags
    restoreTableRows(db, "tags", data.tags);

    // 7. 恢复 sites
    restoreTableRows(db, "sites", data.sites);

    // 8. 恢复 site_tags
    restoreTableRows(db, "site_tags", data.siteTags);

    // 9. 恢复 theme_appearances
    restoreTableRows(db, "theme_appearances", data.themeAppearances);

    // 10. 恢复 app_settings（仅快照中包含的 key）
    restoreAppSettings(db, data.appSettings);

    // 11. 恢复 site_relations
    restoreTableRows(db, "site_relations", data.siteRelations);

    // 12. 重建搜索文本
    const sites = db.prepare("SELECT id FROM sites WHERE owner_id = ?").all(ownerId) as Array<{ id: string }>;
    for (const site of sites) {
      db.prepare(
        "UPDATE sites SET search_text = LOWER(COALESCE(name,'') || ' ' || COALESCE(description,'') || ' ' || COALESCE(recommend_context,'')) WHERE id = ?",
      ).run(site.id);
    }

    // 13. 删除该快照之后的所有快照
    deleteSnapshotsAfter(ownerId, id);
  });

  try {
    transaction();
    logger.info(`快照已恢复: ${id}`);
    return true;
  } catch (err) {
    logger.error(`快照恢复失败: ${id}`, err);
    return false;
  }
}

/** 恢复表数据行（动态匹配列名，仅插入目标表中存在的列） */
function restoreTableRows(
  db: ReturnType<typeof getDb>,
  tableName: string,
  rows: Record<string, unknown>[],
): void {
  if (rows.length === 0) return;
  const tableColumns = getTableColumns(db, tableName);
  for (const row of rows) {
    const filteredEntries = Object.entries(row).filter(([k, _v]) => tableColumns.includes(k));
    if (filteredEntries.length === 0) continue;
    const cols = filteredEntries.map(([k]) => `"${k}"`);
    const placeholders = filteredEntries.map(() => "?");
    const values = filteredEntries.map(([_k, v]) => v);
    db.prepare(
      `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
    ).run(...values);
  }
}

/** 恢复 app_settings */
function restoreAppSettings(db: ReturnType<typeof getDb>, settings: Record<string, unknown>[]): void {
  for (const row of settings) {
    const key = row.key as string;
    const value = row.value as string | null;
    if (!key) continue;
    // 使用 INSERT OR REPLACE，避免主键冲突
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
  }
}
