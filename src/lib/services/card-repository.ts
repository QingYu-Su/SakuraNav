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
export async function getAllCards(): Promise<SocialCard[]> {
  const db = await getDb();
  const rows = await db.query<CardRow>("SELECT * FROM cards ORDER BY global_sort_order ASC");
  return rows.map(mapCardRow);
}

/** 根据 ID 获取卡片 */
export async function getCardById(id: string): Promise<SocialCard | null> {
  const db = await getDb();
  const row = await db.queryOne<CardRow>("SELECT * FROM cards WHERE id = ?", [id]);
  return row ? mapCardRow(row) : null;
}

/** 创建社交卡片 */
export async function createCard(input: {
  cardType: SocialCardType;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
}): Promise<SocialCard> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `card-${crypto.randomUUID()}`;
  const orderRow = await db.queryOne<{ maxOrder: number }>(
    "SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM cards",
  );

  await db.execute(
    `
    INSERT INTO cards (id, card_type, label, icon_url, icon_bg_color, payload, global_sort_order, created_at, updated_at)
    VALUES (@id, @cardType, @label, @iconUrl, @iconBgColor, @payload, @globalSortOrder, @createdAt, @updatedAt)
  `,
    {
      id,
      cardType: input.cardType,
      label: input.label,
      iconUrl: input.iconUrl,
      iconBgColor: input.iconBgColor,
      payload: JSON.stringify(input.payload),
      globalSortOrder: orderRow!.maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    },
  );

  return (await getCardById(id))!;
}

/** 更新社交卡片 */
export async function updateCard(input: {
  id: string;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
}): Promise<SocialCard | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `
    UPDATE cards
    SET label = @label,
        icon_url = @iconUrl,
        icon_bg_color = @iconBgColor,
        payload = @payload,
        updated_at = @updatedAt
    WHERE id = @id
  `,
    {
      id: input.id,
      label: input.label,
      iconUrl: input.iconUrl,
      iconBgColor: input.iconBgColor,
      payload: JSON.stringify(input.payload),
      updatedAt: now,
    },
  );

  return getCardById(input.id);
}

/** 删除社交卡片 */
export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM cards WHERE id = ?", [id]);
}

/** 重新排序社交卡片 */
export async function reorderCards(cardIds: string[]): Promise<void> {
  const db = await getDb();
  await db.transaction(async () => {
    for (let i = 0; i < cardIds.length; i++) {
      await db.execute("UPDATE cards SET global_sort_order = ? WHERE id = ?", [i, cardIds[i]]);
    }
  });
}

/** 获取卡片数量 */
export async function getCardCount(): Promise<number> {
  const db = await getDb();
  const row = await db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM cards");
  return row!.count;
}

/** 删除所有社交卡片 */
export async function deleteAllCards(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM cards");
}
