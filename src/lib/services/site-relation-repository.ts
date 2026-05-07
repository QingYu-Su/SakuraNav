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
export async function getRelatedSites(siteId: string): Promise<RelatedSiteItem[]> {
  const db = await getDb();
  const rows = await db.query<{
    siteId: string;
    siteName: string;
    siteIconUrl: string | null;
    siteUrl: string;
    enabled: number;
    sortOrder: number;
    source: string;
    reason: string;
  }>(`
    SELECT
      sr.target_site_id AS siteId,
      s.name AS siteName,
      s.icon_url AS siteIconUrl,
      s.url AS siteUrl,
      sr.is_enabled AS enabled,
      sr.sort_order AS sortOrder,
      sr.source,
      sr.reason
    FROM site_relations sr
    JOIN sites s ON s.id = sr.target_site_id
    WHERE sr.source_site_id = ?
    ORDER BY sr.sort_order ASC
  `, [siteId]);

  return rows.map((row) => ({
    siteId: row.siteId,
    siteName: row.siteName,
    siteIconUrl: row.siteIconUrl,
    siteUrl: row.siteUrl,
    enabled: Boolean(row.enabled),
    sortOrder: row.sortOrder,
    source: (row.source === "ai" ? "ai" : "manual") as RelatedSiteItem["source"],
    reason: row.reason || "",
  }));
}

/**
 * 批量获取多个网站的关联数据
 */
export async function getRelatedSitesForIds(siteIds: string[]): Promise<Map<string, RelatedSiteItem[]>> {
  if (!siteIds.length) return new Map<string, RelatedSiteItem[]>();
  const db = await getDb();
  const placeholders = siteIds.map(() => "?").join(",");
  const rows = await db.query<{
    source_site_id: string;
    siteId: string;
    siteName: string;
    siteIconUrl: string | null;
    siteUrl: string;
    enabled: number;
    sortOrder: number;
    source: string;
    reason: string;
  }>(`
    SELECT
      sr.source_site_id,
      sr.target_site_id AS siteId,
      s.name AS siteName,
      s.icon_url AS siteIconUrl,
      s.url AS siteUrl,
      sr.is_enabled AS enabled,
      sr.sort_order AS sortOrder,
      sr.source,
      sr.reason
    FROM site_relations sr
    JOIN sites s ON s.id = sr.target_site_id
    WHERE sr.source_site_id IN (${placeholders})
    ORDER BY sr.sort_order ASC
  `, siteIds);

  const map = new Map<string, RelatedSiteItem[]>();
  for (const row of rows) {
    const list = map.get(row.source_site_id) ?? [];
    list.push({
      siteId: row.siteId,
      siteName: row.siteName,
      siteIconUrl: row.siteIconUrl,
      siteUrl: row.siteUrl,
      enabled: Boolean(row.enabled),
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
 * 用户编辑时全量替换所有关联；重新插入时使用 INSERT OR REPLACE 确保唯一约束不冲突
 */
export async function saveRelatedSites(
  siteId: string,
  items: Array<{
    siteId: string;
    enabled: boolean;
    sortOrder: number;
    source?: "ai" | "manual";
    reason?: string;
  }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.transaction(async () => {
    // 全量删除该网站的所有关联关系
    await db.execute("DELETE FROM site_relations WHERE source_site_id = ?", [siteId]);

    // 重新插入所有关联
    const insertSql = `
      INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
      VALUES (@id, @sourceSiteId, @targetSiteId, @sortOrder, @isEnabled, @isLocked, @source, @reason, @createdAt)
    `;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.execute(insertSql, {
        id: `rel-${crypto.randomUUID()}`,
        sourceSiteId: siteId,
        targetSiteId: item.siteId,
        sortOrder: i,
        isEnabled: item.enabled ? 1 : 0,
        isLocked: 0,
        source: item.source === "ai" ? "ai" : "manual",
        reason: item.reason ?? "",
        createdAt: now,
      });
    }
  });
}

/**
 * 删除指定网站的所有关联关系（网站删除时级联调用）
 */
export async function deleteAllRelationsForSite(siteId: string): Promise<void> {
  const db = await getDb();
  // 删除以该网站为源的关联
  await db.execute("DELETE FROM site_relations WHERE source_site_id = ?", [siteId]);
  // 删除以该网站为目标的关联
  await db.execute("DELETE FROM site_relations WHERE target_site_id = ?", [siteId]);
}

/**
 * 将网站 A 添加到其他网站的关联中（反向传播，双向关联）
 * 若已存在关联则跳过（不重复添加）
 */
export async function addReverseRelation(
  sourceSiteId: string,
  targetSiteId: string,
  reason?: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  // 检查是否已存在关联
  const existing = await db.queryOne(
    "SELECT id FROM site_relations WHERE source_site_id = ? AND target_site_id = ?",
    [targetSiteId, sourceSiteId]
  );

  if (existing) return; // 已存在，不重复添加

  // 获取当前最大排序
  const maxOrder = await db.queryOne<{ maxOrder: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_relations WHERE source_site_id = ?",
    [targetSiteId]
  );

  await db.execute(`
    INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
    VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
  `, [`rel-${crypto.randomUUID()}`, targetSiteId, sourceSiteId, maxOrder!.maxOrder + 1, reason ?? "", now]);
}

/**
 * 应用 AI 关联分析结果（智能合并）
 * - 保留 source=manual 的关联不受影响（用户手动勾选的，AI 不修改）
 * - AI 推荐的新关联会添加（source=ai）
 * - 之前 AI 推荐但本次不在推荐列表中的关联会被移除
 * - 移除 A→B 的 AI 关联时，同步移除 B→A 的 AI 关联
 * - 新增 A→C 的关联时，同步建立 C→A 的反向关联（双向）
 */
export async function applyAiRelationResults(
  siteId: string,
  recommendations: Array<{ siteId: string; reason: string; score: number }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.transaction(async () => {
    // 获取当前所有关联
    const currentRows = await db.query<{
      target_site_id: string;
      is_enabled: number;
      is_locked: number;
      source: string;
      reason: string;
      sort_order: number;
    }>(
      "SELECT target_site_id, is_enabled, is_locked, source, reason, sort_order FROM site_relations WHERE source_site_id = ?",
      [siteId]
    );

    const recMap = new Map(recommendations.map((r) => [r.siteId, r]));

    // 删除来源为 AI 的旧关联（不在新推荐列表中的）
    for (const row of currentRows) {
      if (row.source === "manual") continue; // 手动的保留（用户勾选的）
      // AI 来源但不在新推荐列表中 → 删除正向 + 反向
      if (!recMap.has(row.target_site_id)) {
        await db.execute("DELETE FROM site_relations WHERE source_site_id = ? AND target_site_id = ?", [siteId, row.target_site_id]);
        // 同步移除反向 AI 关联（B→A）
        await removeReverseAiRelationTx(db, row.target_site_id, siteId);
      }
    }

    // 添加或更新 AI 推荐的关联
    const existingTargetIds = new Set(currentRows.map((r) => r.target_site_id));
    let maxOrder = currentRows.reduce((max, r) => Math.max(max, r.sort_order), -1);

    for (const rec of recommendations) {
      if (existingTargetIds.has(rec.siteId)) {
        const existingRow = currentRows.find((r) => r.target_site_id === rec.siteId);
        // 用户手动勾选的关联不修改
        if (existingRow?.source === "manual") continue;
        // 已存在 → 更新 source/reason
        await db.execute(
          "UPDATE site_relations SET source = 'ai', reason = ? WHERE source_site_id = ? AND target_site_id = ?",
          [rec.reason, siteId, rec.siteId]
        );
      } else {
        // 新增
        maxOrder++;
        await db.execute(`
          INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
          VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
        `, [`rel-${crypto.randomUUID()}`, siteId, rec.siteId, maxOrder, rec.reason, now]);
      }

      // 建立反向关联（B→A）
      await addReverseRelationTx(db, rec.siteId, siteId, rec.reason, now);
    }

    // 分析完成后，清除 pending 标记
    await db.execute("UPDATE sites SET pending_ai_analysis = 0 WHERE id = ?", [siteId]);
  });
}

/** 在事务内移除反向 AI 关联 */
async function removeReverseAiRelationTx(
  db: Awaited<ReturnType<typeof getDb>>,
  sourceSiteId: string,
  targetSiteId: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM site_relations WHERE source_site_id = ? AND target_site_id = ? AND source = 'ai'",
    [sourceSiteId, targetSiteId]
  );
}

/** 在事务内建立反向关联 */
async function addReverseRelationTx(
  db: Awaited<ReturnType<typeof getDb>>,
  sourceSiteId: string,
  targetSiteId: string,
  reason: string,
  now: string,
): Promise<void> {
  // 已存在则跳过
  const existing = await db.queryOne(
    "SELECT id FROM site_relations WHERE source_site_id = ? AND target_site_id = ?",
    [sourceSiteId, targetSiteId]
  );
  if (existing) return;

  const maxOrder = await db.queryOne<{ maxOrder: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_relations WHERE source_site_id = ?",
    [sourceSiteId]
  );

  await db.execute(`
    INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
    VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
  `, [`rel-${crypto.randomUUID()}`, sourceSiteId, targetSiteId, maxOrder!.maxOrder + 1, reason, now]);
}
