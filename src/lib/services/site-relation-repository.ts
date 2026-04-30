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
      sr.sort_order AS sortOrder,
      sr.source,
      sr.reason
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
    source: string;
    reason: string;
  }>;

  return rows.map((row) => ({
    siteId: row.siteId,
    siteName: row.siteName,
    siteIconUrl: row.siteIconUrl,
    siteUrl: row.siteUrl,
    enabled: Boolean(row.enabled),
    locked: Boolean(row.locked),
    sortOrder: row.sortOrder,
    source: (row.source === "ai" ? "ai" : "manual") as RelatedSiteItem["source"],
    reason: row.reason || "",
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
      sr.sort_order AS sortOrder,
      sr.source,
      sr.reason
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
    source: string;
    reason: string;
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
      source: (row.source === "ai" ? "ai" : "manual") as RelatedSiteItem["source"],
      reason: row.reason || "",
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
    source?: "ai" | "manual";
    reason?: string;
  }>,
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 全量删除该网站的所有关联关系
    db.prepare("DELETE FROM site_relations WHERE source_site_id = ?").run(siteId);

    // 重新插入所有关联
    const insert = db.prepare(`
      INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
      VALUES (@id, @sourceSiteId, @targetSiteId, @sortOrder, @isEnabled, @isLocked, @source, @reason, @createdAt)
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
        source: item.source === "ai" ? "ai" : "manual",
        reason: item.reason ?? "",
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
 * 仅在目标网站允许被关联且未锁定时添加
 */
export function addReverseRelation(
  sourceSiteId: string,
  targetSiteId: string,
  reason?: string,
): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 检查目标网站是否允许被关联
  const targetSite = db.prepare(
    "SELECT allow_linked_by_others FROM sites WHERE id = ?"
  ).get(targetSiteId) as { allow_linked_by_others: number } | undefined;

  if (!targetSite || !targetSite.allow_linked_by_others) return;

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
    INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
    VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
  `).run(`rel-${crypto.randomUUID()}`, targetSiteId, sourceSiteId, maxOrder.maxOrder + 1, reason ?? "", now);
}

/**
 * 应用 AI 关联分析结果（智能合并）
 * - 保留 source=manual 的关联不受影响
 * - 保留 locked=true 的关联不受影响
 * - AI 推荐的新关联会添加（source=ai）
 * - 之前 AI 推荐但本次不在推荐列表中的关联会被移除
 * - 移除 A→B 的 AI 关联时，同步移除 B→A 的 AI 关联（仅非锁定的）
 * - 新增 A→C 的关联时，同步建立 C→A 的反向关联（双向）
 */
export function applyAiRelationResults(
  siteId: string,
  recommendations: Array<{ siteId: string; reason: string; score: number }>,
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 获取当前所有关联
    const currentRows = db.prepare(
      "SELECT target_site_id, is_enabled, is_locked, source, reason, sort_order FROM site_relations WHERE source_site_id = ?"
    ).all(siteId) as Array<{
      target_site_id: string;
      is_enabled: number;
      is_locked: number;
      source: string;
      reason: string;
      sort_order: number;
    }>;

    const recMap = new Map(recommendations.map((r) => [r.siteId, r]));

    // 删除非锁定且来源为 AI 的旧关联（不在新推荐列表中的）
    for (const row of currentRows) {
      if (row.is_locked) continue; // 锁定的保留
      if (row.source === "manual") continue; // 手动的保留
      // AI 来源但不在新推荐列表中 → 删除正向 + 反向
      if (!recMap.has(row.target_site_id)) {
        db.prepare("DELETE FROM site_relations WHERE source_site_id = ? AND target_site_id = ?").run(siteId, row.target_site_id);
        // 同步移除反向 AI 关联（B→A，仅非锁定的 AI 来源）
        removeReverseAiRelationTx(db, row.target_site_id, siteId);
      }
    }

    // 添加或更新 AI 推荐的关联
    const existingTargetIds = new Set(currentRows.map((r) => r.target_site_id));
    let maxOrder = currentRows.reduce((max, r) => Math.max(max, r.sort_order), -1);

    for (const rec of recommendations) {
      // 跳过锁定的现有关联
      const existingRow = currentRows.find((r) => r.target_site_id === rec.siteId);
      if (existingRow?.is_locked) continue;

      if (existingTargetIds.has(rec.siteId)) {
        // 已存在 → 更新 source/reason
        db.prepare(
          "UPDATE site_relations SET source = 'ai', reason = ? WHERE source_site_id = ? AND target_site_id = ?"
        ).run(rec.reason, siteId, rec.siteId);
      } else {
        // 新增
        maxOrder++;
        db.prepare(`
          INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
          VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
        `).run(`rel-${crypto.randomUUID()}`, siteId, rec.siteId, maxOrder, rec.reason, now);
      }

      // 建立反向关联（B→A）
      addReverseRelationTx(db, rec.siteId, siteId, rec.reason, now);
    }

    // 分析完成后，清除 pending 标记
    db.prepare("UPDATE sites SET pending_ai_analysis = 0 WHERE id = ?").run(siteId);
  });

  transaction();
}

/** 在事务内移除反向 AI 关联（仅移除非锁定的 AI 来源关联） */
function removeReverseAiRelationTx(
  db: ReturnType<typeof getDb>,
  sourceSiteId: string,
  targetSiteId: string,
): void {
  db.prepare(
    "DELETE FROM site_relations WHERE source_site_id = ? AND target_site_id = ? AND source = 'ai' AND is_locked = 0"
  ).run(sourceSiteId, targetSiteId);
}

/** 在事务内建立反向关联 */
function addReverseRelationTx(
  db: ReturnType<typeof getDb>,
  sourceSiteId: string,
  targetSiteId: string,
  reason: string,
  now: string,
): void {
  // 检查目标网站是否允许被关联
  const targetSite = db.prepare(
    "SELECT allow_linked_by_others FROM sites WHERE id = ?"
  ).get(targetSiteId) as { allow_linked_by_others: number } | undefined;
  if (!targetSite || !targetSite.allow_linked_by_others) return;

  // 检查源网站是否允许被关联
  const sourceSite = db.prepare(
    "SELECT allow_linked_by_others FROM sites WHERE id = ?"
  ).get(sourceSiteId) as { allow_linked_by_others: number } | undefined;
  if (!sourceSite || !sourceSite.allow_linked_by_others) return;

  // 已存在则跳过
  const existing = db.prepare(
    "SELECT id FROM site_relations WHERE source_site_id = ? AND target_site_id = ?"
  ).get(sourceSiteId, targetSiteId);
  if (existing) return;

  const maxOrder = db.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_relations WHERE source_site_id = ?"
  ).get(sourceSiteId) as { maxOrder: number };

  db.prepare(`
    INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
    VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
  `).run(`rel-${crypto.randomUUID()}`, sourceSiteId, targetSiteId, maxOrder.maxOrder + 1, reason, now);
}


