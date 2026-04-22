/**
 * @description 网站数据仓库 - 管理网站数据的增删改查和排序操作
 * @description 多用户版本：所有操作基于 owner_id 隔离数据空间
 */

import type { Site, SiteTag, PaginatedSites, SocialCardType } from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { getSiteTagsForIds } from "./tag-repository";
import { siteConfig } from "@/lib/config/config";
import { decodeCursor, encodeCursor } from "@/lib/utils/utils";

/** 网站数据库行类型 */
type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon_url: string | null;
  icon_bg_color: string | null;
  is_online: number | null;
  skip_online_check: number;
  is_pinned: number;
  global_sort_order: number;
  card_type: string | null;
  card_data: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

function mapSiteRow(row: SiteRow, tags: SiteTag[]): Site {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    iconUrl: row.icon_url,
    iconBgColor: row.icon_bg_color,
    isOnline: row.is_online == null ? null : Boolean(row.is_online),
    skipOnlineCheck: Boolean(row.skip_online_check),
    isPinned: Boolean(row.is_pinned),
    globalSortOrder: row.global_sort_order,
    cardType: row.card_type as SocialCardType | null,
    cardData: row.card_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

function buildSearchClause(search: string): { clause: string; params: string[] } {
  if (!search) {
    return { clause: "1 = 1", params: [] };
  }

  const like = `%${search}%`;

  return {
    clause: `
      (
        s.name LIKE ?
        OR s.description LIKE ?
        OR EXISTS (
          SELECT 1
          FROM site_tags search_link
          JOIN tags search_tag ON search_tag.id = search_link.tag_id
          WHERE search_link.site_id = s.id
            AND search_tag.name LIKE ?
        )
      )
    `,
    params: [like, like, like],
  };
}

/**
 * 获取分页站点列表
 * @param ownerId 数据所有者 ID
 */
export function getPaginatedSites(options: {
  ownerId: string;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites {
  const db = getDb();
  const offset = decodeCursor(options.cursor ?? null);
  const search = options.query?.trim() ?? "";
  const searchClause = buildSearchClause(search);
  const pageSize = siteConfig.pageSize;

  const filters = ["s.owner_id = ?", searchClause.clause];
  const filterParams: Array<string | number> = [options.ownerId, ...searchClause.params];
  let orderBy = "s.is_pinned DESC, s.global_sort_order ASC, s.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  if (options.scope === "tag") {
    // 社交卡片虚拟标签：按 card_type IS NOT NULL 过滤
    if (options.tagId === SOCIAL_TAG_ID) {
      filters.unshift("s.card_type IS NOT NULL");
    } else {
      filters.unshift(
        "EXISTS (SELECT 1 FROM site_tags filter_link WHERE filter_link.site_id = s.id AND filter_link.tag_id = ?)"
      );
      filterParams.unshift(options.tagId ?? "");
      orderBy = `
        s.is_pinned DESC,
        (
          SELECT filter_order.sort_order
          FROM site_tags filter_order
          WHERE filter_order.site_id = s.id
            AND filter_order.tag_id = ?
        ) ASC,
        s.name COLLATE NOCASE ASC
      `;
      orderParams = [options.tagId ?? ""];
    }
  }

  const whereClause = filters.join(" AND ");

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM sites s
      WHERE ${whereClause}
      `
    )
    .get(...filterParams) as { count: number };

  const queryParams = [...filterParams, ...orderParams, pageSize, offset];
  const rows = db
    .prepare(
      `
      SELECT s.*
      FROM sites s
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
      `
    )
    .all(...queryParams) as SiteRow[];

  const tagsMap = getSiteTagsForIds(
    db,
    rows.map((row) => row.id),
  );

  const items = rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? []));
  const nextOffset = offset + items.length;

  return {
    items,
    total: totalRow.count,
    nextCursor: nextOffset < totalRow.count ? encodeCursor(nextOffset) : null,
  };
}

export function getAllSitesForAdmin(): Site[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM sites
      ORDER BY is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC
      `
    )
    .all() as SiteRow[];
  const tagsMap = getSiteTagsForIds(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? []));
}

export function getSiteById(id: string): Site | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as SiteRow | undefined;
  if (!row) return null;

  const tagsMap = getSiteTagsForIds(db, [row.id]);
  return mapSiteRow(row, tagsMap.get(row.id) ?? []);
}

export function createSite(input: {
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  iconBgColor?: string | null;
  isPinned: boolean;
  skipOnlineCheck?: boolean;
  tagIds: string[];
  cardType?: SocialCardType | null;
  cardData?: string | null;
  ownerId: string;
}): Site | null {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `site-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites WHERE owner_id = ?")
    .get(input.ownerId) as { maxOrder: number };

  const insertSite = db.prepare(`
    INSERT INTO sites (
      id, name, url, description, icon_url, icon_bg_color, skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at
    ) VALUES (
      @id, @name, @url, @description, @iconUrl, @iconBgColor, @skipOnlineCheck, @isPinned, @globalSortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt
    )
  `);

  const insertSiteTag = db.prepare(`
    INSERT INTO site_tags (site_id, tag_id, sort_order)
    VALUES (@siteId, @tagId, @sortOrder)
  `);

  const transaction = db.transaction(() => {
    insertSite.run({
      id,
      name: input.name,
      url: input.url,
      description: input.description ?? null,
      iconUrl: input.iconUrl,
      iconBgColor: input.iconBgColor ?? null,
      skipOnlineCheck: input.skipOnlineCheck ? 1 : 0,
      isPinned: input.isPinned ? 1 : 0,
      globalSortOrder: orderRow.maxOrder + 1,
      cardType: input.cardType ?? null,
      cardData: input.cardData ?? null,
      ownerId: input.ownerId,
      createdAt: now,
      updatedAt: now,
    });

    for (const tagId of input.tagIds) {
      const currentOrder = db
        .prepare(
          "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_tags WHERE tag_id = ?"
        )
        .get(tagId) as { maxOrder: number };
      insertSiteTag.run({
        siteId: id,
        tagId,
        sortOrder: currentOrder.maxOrder + 1,
      });
    }
  });

  transaction();

  return getSiteById(id);
}

export function updateSite(input: {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  iconBgColor?: string | null;
  isPinned: boolean;
  skipOnlineCheck?: boolean;
  tagIds: string[];
  cardType?: SocialCardType | null;
  cardData?: string | null;
}): Site | null {
  const db = getDb();
  const now = new Date().toISOString();
  const existingTags = db
    .prepare("SELECT tag_id, sort_order FROM site_tags WHERE site_id = ?")
    .all(input.id) as Array<{ tag_id: string; sort_order: number }>;

  const existingMap = new Map(existingTags.map((row) => [row.tag_id, row.sort_order]));

  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE sites
      SET name = @name,
          url = @url,
          description = @description,
          icon_url = @iconUrl,
          icon_bg_color = @iconBgColor,
          skip_online_check = @skipOnlineCheck,
          is_pinned = @isPinned,
          card_type = @cardType,
          card_data = @cardData,
          updated_at = @updatedAt
      WHERE id = @id
    `
    ).run({
      id: input.id,
      name: input.name,
      url: input.url,
      description: input.description ?? null,
      iconUrl: input.iconUrl,
      iconBgColor: input.iconBgColor ?? null,
      skipOnlineCheck: input.skipOnlineCheck ? 1 : 0,
      isPinned: input.isPinned ? 1 : 0,
      cardType: input.cardType ?? null,
      cardData: input.cardData ?? null,
      updatedAt: now,
    });

    db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(input.id);

    for (const tagId of input.tagIds) {
      const preserved = existingMap.get(tagId);
      const nextOrder =
        preserved ??
        ((db
          .prepare(
            "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_tags WHERE tag_id = ?"
          )
          .get(tagId) as { maxOrder: number }).maxOrder +
          1);

      db.prepare(
        "INSERT INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)"
      ).run(input.id, tagId, nextOrder);
    }
  });

  transaction();

  return getSiteById(input.id);
}

export function deleteSite(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sites WHERE id = ?").run(id);
}

export function reorderSitesGlobal(siteIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    siteIds.forEach((siteId, index) => {
      db.prepare("UPDATE sites SET global_sort_order = ? WHERE id = ?").run(index, siteId);
    });
  });
  transaction();
}

export function reorderSitesInTag(tagId: string, siteIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    siteIds.forEach((siteId, index) => {
      db.prepare(
        "UPDATE site_tags SET sort_order = ? WHERE tag_id = ? AND site_id = ?"
      ).run(index, tagId, siteId);
    });
  });
  transaction();
}

/** 获取所有站点的 id 和 url（仅普通网站，排除社交卡片） */
export function getAllSiteUrls(): Array<{ id: string; url: string }> {
  const db = getDb();
  return db.prepare("SELECT id, url FROM sites WHERE card_type IS NULL").all() as Array<{ id: string; url: string }>;
}

/** 获取设置了跳过在线检测的站点 ID 列表 */
export function getSkippedOnlineCheckSiteIds(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM sites WHERE skip_online_check = 1").all() as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

export function updateSiteOnlineStatus(siteId: string, isOnline: boolean): void {
  const db = getDb();
  db.prepare("UPDATE sites SET is_online = ? WHERE id = ?").run(isOnline ? 1 : 0, siteId);
}

export function updateSitesOnlineStatus(statusMap: Map<string, boolean>) {
  const db = getDb();
  const statement = db.prepare("UPDATE sites SET is_online = ? WHERE id = ?");
  const updateLastRun = db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const transaction = db.transaction(() => {
    for (const [id, isOnline] of statusMap) {
      statement.run(isOnline ? 1 : 0, id);
    }
    updateLastRun.run({ key: "online_check_last_run", value: new Date().toISOString() });
  });

  transaction();
}

/** 获取指定用户的社交卡片数量 */
export function getSocialCardCount(ownerId?: string): number {
  const db = getDb();
  if (ownerId) {
    const row = db.prepare("SELECT COUNT(*) AS count FROM sites WHERE card_type IS NOT NULL AND owner_id = ?").get(ownerId) as { count: number };
    return row.count;
  }
  const row = db.prepare("SELECT COUNT(*) AS count FROM sites WHERE card_type IS NOT NULL").get() as { count: number };
  return row.count;
}

/** 获取指定用户的社交卡片站点 */
export function getSocialCardSites(ownerId?: string): Site[] {
  const db = getDb();
  const query = ownerId
    ? "SELECT * FROM sites WHERE card_type IS NOT NULL AND owner_id = ? ORDER BY global_sort_order ASC"
    : "SELECT * FROM sites WHERE card_type IS NOT NULL ORDER BY global_sort_order ASC";
  const rows = (ownerId ? db.prepare(query).all(ownerId) : db.prepare(query).all()) as SiteRow[];
  const tagsMap = getSiteTagsForIds(db, rows.map((r) => r.id));
  return rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? []));
}

/** 删除指定用户的所有普通网站卡片 */
export function deleteAllNormalSites(ownerId: string): void {
  const db = getDb();
  const ids = db.prepare("SELECT id FROM sites WHERE card_type IS NULL AND owner_id = ?").all(ownerId) as Array<{ id: string }>;
  const transaction = db.transaction(() => {
    for (const { id } of ids) {
      db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(id);
      db.prepare("DELETE FROM sites WHERE id = ?").run(id);
    }
  });
  transaction();
}

/** 删除指定用户的所有社交卡片 */
export function deleteAllSocialCardSites(ownerId: string): void {
  const db = getDb();
  const ids = db.prepare("SELECT id FROM sites WHERE card_type IS NOT NULL AND owner_id = ?").all(ownerId) as Array<{ id: string }>;
  const transaction = db.transaction(() => {
    for (const { id } of ids) {
      db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(id);
      db.prepare("DELETE FROM sites WHERE id = ?").run(id);
    }
  });
  transaction();
}
