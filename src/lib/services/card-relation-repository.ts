/**
 * 卡片关联推荐数据仓库
 * @description 管理卡片之间的关联关系和 AI 分析队列
 */

import type { RelatedSiteItem } from "@/lib/base/types";
import { getDb } from "@/lib/database";

// ──────────────────────────────────────
// 关联关系 CRUD
// ──────────────────────────────────────

/**
 * 获取指定卡片的所有关联卡片
 * @param cardId 源卡片 ID
 * @returns 关联卡片列表（含目标卡片展示信息）
 */
export async function getRelatedCards(cardId: string): Promise<RelatedSiteItem[]> {
  const db = await getDb();
  const rows = await db.query<{
    cardId: string;
    cardName: string;
    cardIconUrl: string | null;
    cardUrl: string;
    enabled: number;
    sortOrder: number;
    source: string;
    reason: string;
  }>(`
    SELECT
      cr.target_card_id AS cardId,
      c.name AS cardName,
      c.icon_url AS cardIconUrl,
      c.site_url AS cardUrl,
      cr.is_enabled AS enabled,
      cr.sort_order AS sortOrder,
      cr.source,
      cr.reason
    FROM card_relations cr
    JOIN cards c ON c.id = cr.target_card_id
    WHERE cr.source_card_id = ?
    ORDER BY cr.sort_order ASC
  `, [cardId]);

  return rows.map((row) => ({
    cardId: row.cardId,
    cardName: row.cardName,
    cardIconUrl: row.cardIconUrl,
    cardUrl: row.cardUrl,
    enabled: Boolean(row.enabled),
    sortOrder: row.sortOrder,
    source: (row.source === "ai" ? "ai" : "manual") as RelatedSiteItem["source"],
    reason: row.reason || "",
  }));
}

/**
 * 批量获取多个卡片的关联数据
 */
export async function getRelatedCardsForIds(cardIds: string[]): Promise<Map<string, RelatedSiteItem[]>> {
  if (!cardIds.length) return new Map<string, RelatedSiteItem[]>();
  const db = await getDb();
  const placeholders = cardIds.map(() => "?").join(",");
  const rows = await db.query<{
    source_card_id: string;
    cardId: string;
    cardName: string;
    cardIconUrl: string | null;
    cardUrl: string;
    enabled: number;
    sortOrder: number;
    source: string;
    reason: string;
  }>(`
    SELECT
      cr.source_card_id,
      cr.target_card_id AS cardId,
      c.name AS cardName,
      c.icon_url AS cardIconUrl,
      c.site_url AS cardUrl,
      cr.is_enabled AS enabled,
      cr.sort_order AS sortOrder,
      cr.source,
      cr.reason
    FROM card_relations cr
    JOIN cards c ON c.id = cr.target_card_id
    WHERE cr.source_card_id IN (${placeholders})
    ORDER BY cr.sort_order ASC
  `, cardIds);

  const map = new Map<string, RelatedSiteItem[]>();
  for (const row of rows) {
    const list = map.get(row.source_card_id) ?? [];
    list.push({
      cardId: row.cardId,
      cardName: row.cardName,
      cardIconUrl: row.cardIconUrl,
      cardUrl: row.cardUrl,
      enabled: Boolean(row.enabled),
      sortOrder: row.sortOrder,
      source: (row.source === "ai" ? "ai" : "manual") as RelatedSiteItem["source"],
      reason: row.reason || "",
    });
    map.set(row.source_card_id, list);
  }
  return map;
}

/**
 * 保存卡片的关联关系（全量覆盖）
 */
export async function saveRelatedCards(
  cardId: string,
  items: Array<{
    cardId: string;
    enabled: boolean;
    sortOrder: number;
    source?: "ai" | "manual";
    reason?: string;
  }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.transaction(async () => {
    await db.execute("DELETE FROM card_relations WHERE source_card_id = ?", [cardId]);

    const insertSql = `
      INSERT INTO card_relations (id, source_card_id, target_card_id, sort_order, is_enabled, is_locked, source, reason, created_at)
      VALUES (@id, @sourceCardId, @targetCardId, @sortOrder, @isEnabled, @isLocked, @source, @reason, @createdAt)
    `;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.execute(insertSql, {
        id: `rel-${crypto.randomUUID()}`,
        sourceCardId: cardId,
        targetCardId: item.cardId,
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
 * 删除指定卡片的所有关联关系（卡片删除时级联调用）
 */
export async function deleteAllRelationsForCard(cardId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM card_relations WHERE source_card_id = ?", [cardId]);
  await db.execute("DELETE FROM card_relations WHERE target_card_id = ?", [cardId]);
}

/**
 * 将卡片 A 添加到其他卡片的关联中（反向传播，双向关联）
 */
export async function addReverseRelation(
  sourceCardId: string,
  targetCardId: string,
  reason?: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.queryOne(
    "SELECT id FROM card_relations WHERE source_card_id = ? AND target_card_id = ?",
    [targetCardId, sourceCardId]
  );

  if (existing) return;

  const maxOrder = await db.queryOne<{ maxOrder: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM card_relations WHERE source_card_id = ?",
    [targetCardId]
  );

  await db.execute(`
    INSERT INTO card_relations (id, source_card_id, target_card_id, sort_order, is_enabled, is_locked, source, reason, created_at)
    VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
  `, [`rel-${crypto.randomUUID()}`, targetCardId, sourceCardId, maxOrder!.maxOrder + 1, reason ?? "", now]);
}

/**
 * 应用 AI 关联分析结果（智能合并）
 */
export async function applyAiRelationResults(
  cardId: string,
  recommendations: Array<{ cardId: string; reason: string; score: number }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.transaction(async () => {
    const currentRows = await db.query<{
      target_card_id: string;
      is_enabled: number;
      is_locked: number;
      source: string;
      reason: string;
      sort_order: number;
    }>(
      "SELECT target_card_id, is_enabled, is_locked, source, reason, sort_order FROM card_relations WHERE source_card_id = ?",
      [cardId]
    );

    const recMap = new Map(recommendations.map((r) => [r.cardId, r]));

    for (const row of currentRows) {
      if (row.source === "manual") continue;
      if (!recMap.has(row.target_card_id)) {
        await db.execute("DELETE FROM card_relations WHERE source_card_id = ? AND target_card_id = ?", [cardId, row.target_card_id]);
        await removeReverseAiRelationTx(db, row.target_card_id, cardId);
      }
    }

    const existingTargetIds = new Set(currentRows.map((r) => r.target_card_id));
    let maxOrder = currentRows.reduce((max, r) => Math.max(max, r.sort_order), -1);

    for (const rec of recommendations) {
      if (existingTargetIds.has(rec.cardId)) {
        const existingRow = currentRows.find((r) => r.target_card_id === rec.cardId);
        if (existingRow?.source === "manual") continue;
        await db.execute(
          "UPDATE card_relations SET source = 'ai', reason = ? WHERE source_card_id = ? AND target_card_id = ?",
          [rec.reason, cardId, rec.cardId]
        );
      } else {
        maxOrder++;
        await db.execute(`
          INSERT INTO card_relations (id, source_card_id, target_card_id, sort_order, is_enabled, is_locked, source, reason, created_at)
          VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
        `, [`rel-${crypto.randomUUID()}`, cardId, rec.cardId, maxOrder, rec.reason, now]);
      }

      await addReverseRelationTx(db, rec.cardId, cardId, rec.reason, now);
    }

    await db.execute("UPDATE cards SET site_pending_ai_analysis = 0 WHERE id = ?", [cardId]);
  });
}

/** 在事务内移除反向 AI 关联 */
async function removeReverseAiRelationTx(
  db: Awaited<ReturnType<typeof getDb>>,
  sourceCardId: string,
  targetCardId: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM card_relations WHERE source_card_id = ? AND target_card_id = ? AND source = 'ai'",
    [sourceCardId, targetCardId]
  );
}

/** 在事务内建立反向关联 */
async function addReverseRelationTx(
  db: Awaited<ReturnType<typeof getDb>>,
  sourceCardId: string,
  targetCardId: string,
  reason: string,
  now: string,
): Promise<void> {
  const existing = await db.queryOne(
    "SELECT id FROM card_relations WHERE source_card_id = ? AND target_card_id = ?",
    [sourceCardId, targetCardId]
  );
  if (existing) return;

  const maxOrder = await db.queryOne<{ maxOrder: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM card_relations WHERE source_card_id = ?",
    [sourceCardId]
  );

  await db.execute(`
    INSERT INTO card_relations (id, source_card_id, target_card_id, sort_order, is_enabled, is_locked, source, reason, created_at)
    VALUES (?, ?, ?, ?, 1, 0, 'ai', ?, ?)
  `, [`rel-${crypto.randomUUID()}`, sourceCardId, targetCardId, maxOrder!.maxOrder + 1, reason, now]);
}
