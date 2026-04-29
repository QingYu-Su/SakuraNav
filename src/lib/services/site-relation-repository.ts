/**
 * 网站关联推荐数据仓库
 * @description 管理网站之间的关联关系和 AI 分析队列
 */

import type { RelatedSiteItem } from "@/lib/base/types";
import { getDb } from "@/lib/database";

// ──────────────────────────────────────
// 关联关系 CRUD
// ──────────────────────────────────────

/**
 * 获取指定网站的所有关联网站
 * @param siteId 源网站 ID
 * @returns 关联网站列表（含目标网站展示信息）
 */
export function getRelatedSites(siteId: string): RelatedSiteItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      sr.target_site_id AS siteId,
      s.name AS siteName,
      s.icon_url AS siteIconUrl,
      s.url AS siteUrl,
      sr.is_enabled AS enabled,
      sr.is_locked AS locked,
      sr.sort_order AS sortOrder
    FROM site_relations sr
    JOIN sites s ON s.id = sr.target_site_id
    WHERE sr.source_site_id = ?
    ORDER BY sr.sort_order ASC
  `).all(siteId) as Array<{
    siteId: string;
    siteName: string;
    siteIconUrl: string | null;
    siteUrl: string;
    enabled: number;
    locked: number;
    sortOrder: number;
  }>;

  return rows.map((row) => ({
    siteId: row.siteId,
    siteName: row.siteName,
    siteIconUrl: row.siteIconUrl,
    siteUrl: row.siteUrl,
    enabled: Boolean(row.enabled),
    locked: Boolean(row.locked),
    sortOrder: row.sortOrder,
  }));
}

/**
 * 批量获取多个网站的关联数据
 */
export function getRelatedSitesForIds(siteIds: string[]): Map<string, RelatedSiteItem[]> {
  if (!siteIds.length) return new Map<string, RelatedSiteItem[]>();
  const db = getDb();
  const placeholders = siteIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT
      sr.source_site_id,
      sr.target_site_id AS siteId,
      s.name AS siteName,
      s.icon_url AS siteIconUrl,
      s.url AS siteUrl,
      sr.is_enabled AS enabled,
      sr.is_locked AS locked,
      sr.sort_order AS sortOrder
    FROM site_relations sr
    JOIN sites s ON s.id = sr.target_site_id
    WHERE sr.source_site_id IN (${placeholders})
    ORDER BY sr.sort_order ASC
  `).all(...siteIds) as Array<{
    source_site_id: string;
    siteId: string;
    siteName: string;
    siteIconUrl: string | null;
    siteUrl: string;
    enabled: number;
    locked: number;
    sortOrder: number;
  }>;

  const map = new Map<string, RelatedSiteItem[]>();
  for (const row of rows) {
    const list = map.get(row.source_site_id) ?? [];
    list.push({
      siteId: row.siteId,
      siteName: row.siteName,
      siteIconUrl: row.siteIconUrl,
      siteUrl: row.siteUrl,
      enabled: Boolean(row.enabled),
      locked: Boolean(row.locked),
      sortOrder: row.sortOrder,
    });
    map.set(row.source_site_id, list);
  }
  return map;
}

/**
 * 保存网站的关联关系（全量覆盖）
 * 用户编辑时全量替换所有关联（含锁定和非锁定）；重新插入时使用 INSERT OR REPLACE 确保唯一约束不冲突
 */
export function saveRelatedSites(
  siteId: string,
  items: Array<{
    siteId: string;
    enabled: boolean;
    locked: boolean;
    sortOrder: number;
  }>,
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 全量删除该网站的所有关联关系
    db.prepare("DELETE FROM site_relations WHERE source_site_id = ?").run(siteId);

    // 重新插入所有关联
    const insert = db.prepare(`
      INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, created_at)
      VALUES (@id, @sourceSiteId, @targetSiteId, @sortOrder, @isEnabled, @isLocked, @createdAt)
    `);

    let order = 0;
    for (const item of items) {
      insert.run({
        id: `rel-${crypto.randomUUID()}`,
        sourceSiteId: siteId,
        targetSiteId: item.siteId,
        sortOrder: item.locked ? item.sortOrder : order++,
        isEnabled: item.enabled ? 1 : 0,
        isLocked: item.locked ? 1 : 0,
        createdAt: now,
      });
    }
  });

  transaction();
}

/**
 * 删除指定网站的所有关联关系（网站删除时级联调用）
 */
export function deleteAllRelationsForSite(siteId: string): void {
  const db = getDb();
  // 删除以该网站为源的关联
  db.prepare("DELETE FROM site_relations WHERE source_site_id = ?").run(siteId);
  // 删除以该网站为目标的关联
  db.prepare("DELETE FROM site_relations WHERE target_site_id = ?").run(siteId);
}

/**
 * 将网站 A 添加到其他网站的关联中（反向传播，不触发 AI）
 * 仅在目标网站开启了 AI 关联且未锁定时添加
 */
export function addReverseRelation(
  sourceSiteId: string,
  targetSiteId: string,
): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 检查目标网站是否开启了 AI 关联和允许被关联
  const targetSite = db.prepare(
    "SELECT ai_relation_enabled, allow_linked_by_others FROM sites WHERE id = ?"
  ).get(targetSiteId) as { ai_relation_enabled: number; allow_linked_by_others: number } | undefined;

  if (!targetSite || !targetSite.ai_relation_enabled || !targetSite.allow_linked_by_others) return;

  // 检查源网站是否允许被关联
  const sourceSite = db.prepare(
    "SELECT allow_linked_by_others FROM sites WHERE id = ?"
  ).get(sourceSiteId) as { allow_linked_by_others: number } | undefined;

  if (!sourceSite || !sourceSite.allow_linked_by_others) return;

  // 检查是否已存在关联
  const existing = db.prepare(
    "SELECT id, is_locked FROM site_relations WHERE source_site_id = ? AND target_site_id = ?"
  ).get(targetSiteId, sourceSiteId) as { id: string; is_locked: number } | undefined;

  if (existing) return; // 已存在，不重复添加

  // 获取当前最大排序
  const maxOrder = db.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_relations WHERE source_site_id = ?"
  ).get(targetSiteId) as { maxOrder: number };

  db.prepare(`
    INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, created_at)
    VALUES (?, ?, ?, ?, 1, 0, ?)
  `).run(`rel-${crypto.randomUUID()}`, targetSiteId, sourceSiteId, maxOrder.maxOrder + 1, now);
}

// ──────────────────────────────────────
// AI 关联分析队列
// ──────────────────────────────────────

/**
 * 将网站加入 AI 关联分析队列
 * @param siteId 网站ID
 * @param priority 优先级（越高越先处理）
 */
export function enqueueRelationAnalysis(siteId: string, priority = 0): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO ai_relation_queue (id, site_id, priority, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(`queue-${crypto.randomUUID()}`, siteId, priority, now);
}

/**
 * 获取待处理的队列项
 * @param limit 最大处理数量
 */
export function getPendingQueueItems(limit: number): Array<{ id: string; site_id: string }> {
  const db = getDb();
  return db.prepare(`
    SELECT id, site_id FROM ai_relation_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT ?
  `).all(limit) as Array<{ id: string; site_id: string }>;
}

/**
 * 更新队列项状态
 */
export function updateQueueItemStatus(id: string, status: string): void {
  const db = getDb();
  if (status === "done") {
    db.prepare("DELETE FROM ai_relation_queue WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE ai_relation_queue SET status = ? WHERE id = ?").run(status, id);
  }
}

/**
 * 清理过期的队列项（超过 24 小时仍为 processing 状态的）
 */
export function cleanupStaleQueueItems(): void {
  const db = getDb();
  db.prepare(`
    DELETE FROM ai_relation_queue
    WHERE status = 'processing'
    AND created_at < datetime('now', '-24 hours')
  `).run();
}

/**
 * 获取队列统计信息
 */
export function getQueueStats(): { pending: number; processing: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing
    FROM ai_relation_queue
  `).get() as { pending: number; processing: number };
  return { pending: row.pending ?? 0, processing: row.processing ?? 0 };
}
