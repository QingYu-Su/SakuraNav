/**
 * @description 社交卡片数据仓库 - 管理社交卡片的增删改查和排序操作
 */

import type { SocialCard, SocialCardPayload, SocialCardType } from "@/lib/base/types";
import { getDb } from "@/lib/database";

/** 卡片数据库行类型 */
type CardRow = {
  id: string;
  card_type: string;
  label: string;
  icon_url: string | null;
  icon_bg_color: string | null;
  payload: string;
  global_sort_order: number;
  created_at: string;
  updated_at: string;
};

/** 映射数据库行到应用层类型 */
function mapCardRow(row: CardRow): SocialCard {
  const parsed = JSON.parse(row.payload) as SocialCardPayload;
  return {
    id: row.id,
    cardType: row.card_type as SocialCardType,
    label: row.label,
    iconUrl: row.icon_url,
    iconBgColor: row.icon_bg_color,
    payload: parsed,
    hint: null,
    globalSortOrder: row.global_sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 获取所有社交卡片 */
export function getAllCards(): SocialCard[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM cards ORDER BY global_sort_order ASC")
    .all() as CardRow[];
  return rows.map(mapCardRow);
}

/** 根据 ID 获取卡片 */
export function getCardById(id: string): SocialCard | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as CardRow | undefined;
  return row ? mapCardRow(row) : null;
}

/** 创建社交卡片 */
export function createCard(input: {
  cardType: SocialCardType;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
}): SocialCard {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `card-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM cards")
    .get() as { maxOrder: number };

  db.prepare(`
    INSERT INTO cards (id, card_type, label, icon_url, icon_bg_color, payload, global_sort_order, created_at, updated_at)
    VALUES (@id, @cardType, @label, @iconUrl, @iconBgColor, @payload, @globalSortOrder, @createdAt, @updatedAt)
  `).run({
    id,
    cardType: input.cardType,
    label: input.label,
    iconUrl: input.iconUrl,
    iconBgColor: input.iconBgColor,
    payload: JSON.stringify(input.payload),
    globalSortOrder: orderRow.maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  });

  return getCardById(id)!;
}

/** 更新社交卡片 */
export function updateCard(input: {
  id: string;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
}): SocialCard | null {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cards
    SET label = @label,
        icon_url = @iconUrl,
        icon_bg_color = @iconBgColor,
        payload = @payload,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: input.id,
    label: input.label,
    iconUrl: input.iconUrl,
    iconBgColor: input.iconBgColor,
    payload: JSON.stringify(input.payload),
    updatedAt: now,
  });

  return getCardById(input.id);
}

/** 删除社交卡片 */
export function deleteCard(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM cards WHERE id = ?").run(id);
}

/** 重新排序社交卡片 */
export function reorderCards(cardIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    cardIds.forEach((cardId, index) => {
      db.prepare("UPDATE cards SET global_sort_order = ? WHERE id = ?").run(index, cardId);
    });
  });
  transaction();
}

/** 获取卡片数量 */
export function getCardCount(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS count FROM cards").get() as { count: number };
  return row.count;
}

/** 删除所有社交卡片 */
export function deleteAllCards(): void {
  const db = getDb();
  db.prepare("DELETE FROM cards").run();
}
