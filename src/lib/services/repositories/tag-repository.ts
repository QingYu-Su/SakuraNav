/**
 * @description 标签数据仓库 - 管理标签数据的增删改查和排序操作
 */

import type Database from "better-sqlite3";
import type { Tag, SiteTag } from "@/lib/types";
import { getDb } from "@/lib/core/database";

/** 标签数据库行类型 */
type TagRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_hidden: number;
  logo_url: string | null;
  logo_bg_color: string | null;
  description: string | null;
  site_count?: number;
};

function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isHidden: Boolean(row.is_hidden),
    logoUrl: row.logo_url,
    logoBgColor: row.logo_bg_color,
    siteCount: row.site_count ?? 0,
    description: row.description ?? null,
  };
}

export function getVisibleTags(isAuthenticated: boolean): Tag[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.sort_order,
        t.is_hidden,
        t.logo_url,
        t.description,
        COUNT(DISTINCT s.id) AS site_count
      FROM tags t
      LEFT JOIN site_tags st ON st.tag_id = t.id
      LEFT JOIN sites s ON s.id = st.site_id
        AND ${
          isAuthenticated
            ? "1 = 1"
            : `
          NOT EXISTS (
            SELECT 1
            FROM site_tags hidden_link
            JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
            WHERE hidden_link.site_id = s.id
              AND hidden_tag.is_hidden = 1
          )
        `
        }
      WHERE ${isAuthenticated ? "1 = 1" : "t.is_hidden = 0"}
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.name COLLATE NOCASE ASC
      `
    )
    .all() as TagRow[];

  return rows.map(mapTagRow);
}

export function getTagById(id: string): Tag | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tags WHERE id = ?").get(id) as TagRow | undefined;
  return row ? mapTagRow(row) : null;
}

export function createTag(input: {
  name: string;
  isHidden: boolean;
  logoUrl: string | null;
  logoBgColor: string | null;
  description: string | null;
}): Tag {
  const db = getDb();
  const id = `tag-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags")
    .get() as { maxOrder: number };

  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || id;

  db.prepare(
    `
    INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description)
    VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description)
  `
  ).run({
    id,
    name: input.name,
    slug,
    sortOrder: orderRow.maxOrder + 1,
    isHidden: input.isHidden ? 1 : 0,
    logoUrl: input.logoUrl,
    logoBgColor: input.logoBgColor,
    description: input.description,
  });

  return getVisibleTags(true).find((tag) => tag.id === id) ?? null!;
}

export function updateTag(input: {
  id: string;
  name: string;
  isHidden: boolean;
  logoUrl: string | null;
  logoBgColor: string | null;
  description: string | null;
}): Tag | null {
  const db = getDb();
  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || input.id;

  db.prepare(
    `
    UPDATE tags
    SET name = @name,
        slug = @slug,
        is_hidden = @isHidden,
        logo_url = @logoUrl,
        logo_bg_color = @logoBgColor,
        description = @description
    WHERE id = @id
  `
  ).run({
    id: input.id,
    name: input.name,
    slug,
    isHidden: input.isHidden ? 1 : 0,
    logoUrl: input.logoUrl,
    logoBgColor: input.logoBgColor,
    description: input.description,
  });

  return getVisibleTags(true).find((tag) => tag.id === input.id) ?? null;
}

export function deleteTag(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM tags WHERE id = ?").run(id);
}

export function reorderTags(tagIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    tagIds.forEach((tagId, index) => {
      db.prepare("UPDATE tags SET sort_order = ? WHERE id = ?").run(index, tagId);
    });
  });
  transaction();
}

/**
 * 批量获取网站关联的标签
 * @param db 数据库实例
 * @param siteIds 网站 ID 列表
 * @param isAuthenticated 是否已认证
 * @returns 网站 ID 到标签列表的映射
 */
export function getSiteTagsForIds(
  db: Database.Database,
  siteIds: string[],
  isAuthenticated: boolean
): Map<string, SiteTag[]> {
  if (!siteIds.length) return new Map<string, SiteTag[]>();

  const placeholders = siteIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `
      SELECT
        st.site_id,
        t.id,
        t.name,
        t.slug,
        t.is_hidden,
        st.sort_order
      FROM site_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE st.site_id IN (${placeholders})
        ${isAuthenticated ? "" : "AND t.is_hidden = 0"}
      ORDER BY st.sort_order ASC, t.sort_order ASC
      `
    )
    .all(...siteIds) as Array<
    SiteTag & { site_id: string; is_hidden: number; sort_order: number }
  >;

  const tagsMap = new Map<string, SiteTag[]>();

  for (const row of rows) {
    const next = tagsMap.get(row.site_id) ?? [];
    next.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isHidden: Boolean(row.is_hidden),
      sortOrder: row.sort_order,
    });
    tagsMap.set(row.site_id, next);
  }

  return tagsMap;
}
