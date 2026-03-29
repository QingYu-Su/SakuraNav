/**
 * @description 网站数据仓库 - 管理网站数据的增删改查和排序操作
 */

import type { Site, SiteTag, PaginatedSites } from "@/lib/types";
import { getDb } from "@/lib/core/database";
import { getSiteTagsForIds } from "./tag-repository";
import { siteConfig } from "@/lib/config";
import { decodeCursor, encodeCursor } from "@/lib/utils";

/** 网站数据库行类型 */
type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon_url: string | null;
  is_pinned: number;
  global_sort_order: number;
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
    isPinned: Boolean(row.is_pinned),
    globalSortOrder: row.global_sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

function buildVisibilityClause(isAuthenticated: boolean): string {
  if (isAuthenticated) return "1 = 1";

  return `
    NOT EXISTS (
      SELECT 1
      FROM site_tags hidden_link
      JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
      WHERE hidden_link.site_id = s.id
        AND hidden_tag.is_hidden = 1
    )
  `;
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

export function getPaginatedSites(options: {
  isAuthenticated: boolean;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites {
  const db = getDb();
  const offset = decodeCursor(options.cursor ?? null);
  const search = options.query?.trim() ?? "";
  const searchClause = buildSearchClause(search);
  const visibilityClause = buildVisibilityClause(options.isAuthenticated);
  const pageSize = siteConfig.pageSize;

  const filters = [visibilityClause, searchClause.clause];
  const filterParams: Array<string | number> = [...searchClause.params];
  let orderBy = "s.is_pinned DESC, s.global_sort_order ASC, s.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  if (options.scope === "tag") {
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
    options.isAuthenticated
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
    true
  );

  return rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? []));
}

export function getSiteById(id: string): Site | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as SiteRow | undefined;
  if (!row) return null;
  
  const tagsMap = getSiteTagsForIds(db, [row.id], true);
  return mapSiteRow(row, tagsMap.get(row.id) ?? []);
}

export function createSite(input: {
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  isPinned: boolean;
  tagIds: string[];
}): Site | null {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `site-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites")
    .get() as { maxOrder: number };

  const insertSite = db.prepare(`
    INSERT INTO sites (
      id, name, url, description, icon_url, is_pinned, global_sort_order, created_at, updated_at
    ) VALUES (
      @id, @name, @url, @description, @iconUrl, @isPinned, @globalSortOrder, @createdAt, @updatedAt
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
      isPinned: input.isPinned ? 1 : 0,
      globalSortOrder: orderRow.maxOrder + 1,
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
  isPinned: boolean;
  tagIds: string[];
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
          is_pinned = @isPinned,
          updated_at = @updatedAt
      WHERE id = @id
    `
    ).run({
      id: input.id,
      name: input.name,
      url: input.url,
      description: input.description ?? null,
      iconUrl: input.iconUrl,
      isPinned: input.isPinned ? 1 : 0,
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

/**
 * 重新排序标签内的网站顺序
 * @param tagId 标签 ID
 * @param siteIds 网站ID数组（按新顺序排列）
 */
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
