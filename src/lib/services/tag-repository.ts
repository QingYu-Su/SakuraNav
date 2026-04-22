/**
 * @description 标签数据仓库 - 管理标签数据的增删改查和排序操作
 * @description 多用户版本：所有操作基于 owner_id 隔离数据空间
 */

import type Database from "better-sqlite3";
import type { Tag, SiteTag } from "@/lib/base/types";
import { getDb } from "@/lib/database";

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
  owner_id: string;
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

/**
 * 获取指定用户的可见标签列表
 * @param ownerId 数据所有者 ID（游客传入 ADMIN_USER_ID 查看公开数据）
 */
export function getVisibleTags(ownerId: string): Tag[] {
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
        t.logo_bg_color,
        t.description,
        t.owner_id,
        COUNT(DISTINCT s.id) AS site_count
      FROM tags t
      LEFT JOIN site_tags st ON st.tag_id = t.id
      LEFT JOIN sites s ON s.id = st.site_id AND s.owner_id = t.owner_id
      WHERE t.owner_id = ?
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.name COLLATE NOCASE ASC
      `
    )
    .all(ownerId) as TagRow[];

  return rows.map(mapTagRow);
}

/** 获取所有者的标签数量 */
export function getTagCountByOwner(ownerId: string): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS count FROM tags WHERE owner_id = ?").get(ownerId) as { count: number };
  return row.count;
}

export function getTagById(id: string): Tag | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tags WHERE id = ?").get(id) as TagRow | undefined;
  return row ? mapTagRow(row) : null;
}

export function createTag(input: {
  name: string;
  isHidden?: boolean;
  logoUrl: string | null;
  logoBgColor: string | null;
  description: string | null;
  ownerId: string;
}): Tag {
  const db = getDb();
  const id = `tag-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags WHERE owner_id = ?")
    .get(input.ownerId) as { maxOrder: number };

  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || id;

  db.prepare(
    `
    INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
    VALUES (@id, @name, @slug, @sortOrder, 0, @logoUrl, @logoBgColor, @description, @ownerId)
  `
  ).run({
    id,
    name: input.name,
    slug,
    sortOrder: orderRow.maxOrder + 1,
    logoUrl: input.logoUrl,
    logoBgColor: input.logoBgColor,
    description: input.description,
    ownerId: input.ownerId,
  });

  return getTagById(id)!;
}

export function updateTag(input: {
  id: string;
  name: string;
  isHidden?: boolean;
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
        logo_url = @logoUrl,
        logo_bg_color = @logoBgColor,
        description = @description
    WHERE id = @id
  `
  ).run({
    id: input.id,
    name: input.name,
    slug,
    logoUrl: input.logoUrl,
    logoBgColor: input.logoBgColor,
    description: input.description,
  });

  return getTagById(input.id);
}

export function deleteTag(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM tags WHERE id = ?").run(id);
}

/**
 * 批量恢复标签与站点的关联（用于标签删除撤销）
 */
export function restoreTagSites(tagId: string, siteIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    for (let i = 0; i < siteIds.length; i++) {
      db.prepare(
        "INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)"
      ).run(siteIds[i], tagId, i);
    }
  });
  transaction();
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
 * 批量获取网站关联的标签（限定同一 owner 空间）
 */
export function getSiteTagsForIds(
  db: Database.Database,
  siteIds: string[],
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
