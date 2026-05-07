/**
 * 快照数据仓库
 * @description 管理导航站数据快照的 CRUD 操作
 * 快照在用户退出编辑模式或刷新页面时自动创建，用于版本回退
 */

import { getDb, type DatabaseAdapter } from "@/lib/database";
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

/** 比较两份快照数据是否相同（忽略 exportedAt 时间戳） */
function isSnapshotDataIdentical(a: SnapshotData, b: SnapshotData): boolean {
  const { exportedAt: _a, ...dataA } = a;
  const { exportedAt: _b, ...dataB } = b;
  return JSON.stringify(dataA) === JSON.stringify(dataB);
}

// ── 读取 ──

/** 获取指定用户的所有快照元信息（按创建时间倒序） */
export async function getSnapshotMetas(ownerId: string): Promise<SnapshotMeta[]> {
  const db = await getDb();
  const rows = await db.query<SnapshotRow>(
    "SELECT id, owner_id, label, created_at FROM snapshots WHERE owner_id = ? ORDER BY created_at DESC",
    [ownerId],
  );
  return rows.map((r) => ({
    id: r.id,
    ownerId: r.owner_id,
    label: r.label,
    createdAt: r.created_at,
  }));
}

/** 获取单个快照的完整数据 */
export async function getSnapshotById(id: string, ownerId: string): Promise<(SnapshotMeta & { data: SnapshotData }) | null> {
  const db = await getDb();
  const row = await db.queryOne<SnapshotRow>(
    "SELECT id, owner_id, label, data, created_at FROM snapshots WHERE id = ? AND owner_id = ?",
    [id, ownerId],
  );
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
export async function getSnapshotCount(ownerId: string): Promise<number> {
  const db = await getDb();
  const row = await db.queryOne<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM snapshots WHERE owner_id = ?", [ownerId]);
  return row!.cnt;
}

// ── 创建 ──

/** 采集当前数据库中的导航数据并创建快照（与最新快照相同时跳过） */
export async function createSnapshot(ownerId: string, label: string): Promise<SnapshotMeta | null> {
  const db = await getDb();
  const data = await collectSnapshotData(db, ownerId);

  // 与最新快照比较，数据无变化则跳过创建（避免冗余快照）
  const latestRow = await db.queryOne<Pick<SnapshotRow, "data">>(
    "SELECT data FROM snapshots WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1",
    [ownerId],
  );
  if (latestRow) {
    const latestData = JSON.parse(latestRow.data) as SnapshotData;
    if (isSnapshotDataIdentical(data, latestData)) {
      logger.info(`快照跳过: 数据与最新快照相同`);
      return null;
    }
  }

  const id = `snap-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await db.execute(
    "INSERT INTO snapshots (id, owner_id, label, data, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, ownerId, label, JSON.stringify(data), now],
  );

  // 创建后顺便清理过期快照
  await cleanupExpiredSnapshots();

  logger.info(`快照已创建: ${id} (${label})`);
  return { id, ownerId, label, createdAt: now };
}

/**
 * 采集快照数据：读取当前用户的标签、站点、外观等（排除隐私和运行时状态字段）
 */
async function collectSnapshotData(db: DatabaseAdapter, ownerId: string): Promise<SnapshotData> {
  return {
    tags: await collectTable(db, "tags", "owner_id = ?", [ownerId]),
    sites: await collectTable(db, "sites", "owner_id = ?", [ownerId]),
    siteTags: await collectSiteTagsForOwner(db, ownerId),
    themeAppearances: await collectTable(db, "theme_appearances", "owner_id = ?", [ownerId]),
    appSettings: await collectFilteredAppSettings(db),
    siteRelations: await collectSiteRelationsForOwner(db, ownerId),
    floatingButtons: await collectTable(db, "app_settings", "key = 'floating_buttons'", []),
    exportedAt: new Date().toISOString(),
  };
}

/** 通用表数据采集（排除敏感列） */
async function collectTable(
  db: DatabaseAdapter,
  tableName: string,
  whereClause: string,
  params: unknown[],
): Promise<Record<string, unknown>[]> {
  const columns = await db.getTableColumns(tableName);
  const filteredColumns = columns.filter((c) => !SNAPSHOT_EXCLUDE_COLUMNS.has(c));
  const colList = filteredColumns.map((c) => `"${c}"`).join(", ");
  const rows = await db.query(`SELECT ${colList} FROM ${tableName} WHERE ${whereClause}`, params);
  return rows;
}

/** 采集 site_tags（通过 owner_id 关联 sites 过滤） */
async function collectSiteTagsForOwner(db: DatabaseAdapter, ownerId: string): Promise<Record<string, unknown>[]> {
  return db.query(
    "SELECT st.site_id, st.tag_id, st.sort_order FROM site_tags st INNER JOIN sites s ON st.site_id = s.id WHERE s.owner_id = ?",
    [ownerId],
  );
}

/** 采集 site_relations（通过 owner_id 关联 sites 过滤） */
async function collectSiteRelationsForOwner(db: DatabaseAdapter, ownerId: string): Promise<Record<string, unknown>[]> {
  return db.query(
    "SELECT r.id, r.source_site_id, r.target_site_id, r.sort_order, r.is_enabled, r.is_locked, r.source, r.reason, r.created_at FROM site_relations r INNER JOIN sites s ON r.source_site_id = s.id WHERE s.owner_id = ?",
    [ownerId],
  );
}

/** 采集 app_settings（排除敏感配置） */
async function collectFilteredAppSettings(db: DatabaseAdapter): Promise<Record<string, unknown>[]> {
  const rows = await db.query<{ key: string; value: string | null }>("SELECT key, value FROM app_settings");
  return rows
    .filter((r) => !EXCLUDED_SETTINGS_KEYS.has(r.key))
    .map((r) => ({ key: r.key, value: r.value }));
}

// ── 删除 ──

/** 重命名快照 */
export async function renameSnapshot(id: string, ownerId: string, label: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute("UPDATE snapshots SET label = ? WHERE id = ? AND owner_id = ?", [label, id, ownerId]);
  if (result.changes > 0) {
    logger.info(`快照已重命名: ${id} → ${label}`);
    return true;
  }
  return false;
}

/** 删除单个快照 */
export async function deleteSnapshot(id: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute("DELETE FROM snapshots WHERE id = ? AND owner_id = ?", [id, ownerId]);
  if (result.changes > 0) {
    logger.info(`快照已删除: ${id}`);
    return true;
  }
  return false;
}

/** 删除指定时间之后的所有快照（恢复快照时使用） */
export async function deleteSnapshotsAfter(ownerId: string, snapshotId: string): Promise<number> {
  const db = await getDb();
  // 先找到目标快照的创建时间
  const target = await db.queryOne<{ created_at: string }>("SELECT created_at FROM snapshots WHERE id = ? AND owner_id = ?", [snapshotId, ownerId]);
  if (!target) return 0;
  const result = await db.execute("DELETE FROM snapshots WHERE owner_id = ? AND created_at > ?", [ownerId, target.created_at]);
  if (result.changes > 0) {
    logger.info(`已删除 ${result.changes} 个在快照 ${snapshotId} 之后的快照`);
  }
  return result.changes;
}

/** 清理过期快照（超过 30 天） */
export async function cleanupExpiredSnapshots(): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = await db.execute("DELETE FROM snapshots WHERE created_at < ?", [cutoff]);
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
export async function restoreFromSnapshot(id: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  const snapshot = await getSnapshotById(id, ownerId);
  if (!snapshot) return false;

  const data = snapshot.data;

  try {
    await db.transaction(async () => {
      // 1. 删除当前用户的 site_tags（通过 sites 关联）
      await db.execute(
        "DELETE FROM site_tags WHERE site_id IN (SELECT id FROM sites WHERE owner_id = ?)",
        [ownerId],
      );

      // 2. 删除当前用户的 site_relations
      await db.execute(
        "DELETE FROM site_relations WHERE source_site_id IN (SELECT id FROM sites WHERE owner_id = ?)",
        [ownerId],
      );

      // 3. 删除当前用户的 sites
      await db.execute("DELETE FROM sites WHERE owner_id = ?", [ownerId]);

      // 4. 删除当前用户的 tags
      await db.execute("DELETE FROM tags WHERE owner_id = ?", [ownerId]);

      // 5. 删除当前用户的 theme_appearances
      await db.execute("DELETE FROM theme_appearances WHERE owner_id = ?", [ownerId]);

      // 6. 恢复 tags
      await restoreTableRows(db, "tags", data.tags);

      // 7. 恢复 sites
      await restoreTableRows(db, "sites", data.sites);

      // 8. 恢复 site_tags
      await restoreTableRows(db, "site_tags", data.siteTags);

      // 9. 恢复 theme_appearances
      await restoreTableRows(db, "theme_appearances", data.themeAppearances);

      // 10. 恢复 app_settings（仅快照中包含的 key）
      await restoreAppSettings(db, data.appSettings);

      // 11. 恢复 site_relations
      await restoreTableRows(db, "site_relations", data.siteRelations);

      // 12. 重建搜索文本
      const sites = await db.query<{ id: string }>("SELECT id FROM sites WHERE owner_id = ?", [ownerId]);
      for (const site of sites) {
        await db.execute(
          "UPDATE sites SET search_text = LOWER(COALESCE(name,'') || ' ' || COALESCE(description,'') || ' ' || COALESCE(recommend_context,'')) WHERE id = ?",
          [site.id],
        );
      }

      // 13. 删除该快照之后的所有快照
      await deleteSnapshotsAfter(ownerId, id);
    });

    logger.info(`快照已恢复: ${id}`);
    return true;
  } catch (err) {
    logger.error(`快照恢复失败: ${id}`, err);
    return false;
  }
}

/** 恢复表数据行（动态匹配列名，仅插入目标表中存在的列） */
async function restoreTableRows(
  db: DatabaseAdapter,
  tableName: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  const tableColumns = await db.getTableColumns(tableName);
  for (const row of rows) {
    const filteredEntries = Object.entries(row).filter(([k, _v]) => tableColumns.includes(k));
    if (filteredEntries.length === 0) continue;
    const cols = filteredEntries.map(([k]) => `"${k}"`);
    const placeholders = filteredEntries.map(() => "?");
    const values = filteredEntries.map(([_k, v]) => v);
    await db.execute(
      `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
      values,
    );
  }
}

/** 恢复 app_settings */
async function restoreAppSettings(db: DatabaseAdapter, settings: Record<string, unknown>[]): Promise<void> {
  for (const row of settings) {
    const key = row.key as string;
    const value = row.value as string | null;
    if (!key) continue;
    // 使用 INSERT OR REPLACE，避免主键冲突
    await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", [key, value]);
  }
}
