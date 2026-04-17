/**
 * @description 搜索服务 - 提供搜索建议功能
 */

import { getDb } from "@/lib/core/database";

export function getSearchSuggestions(options: {
  query: string;
  isAuthenticated: boolean;
  limit?: number;
}) {
  const db = getDb();
  const query = options.query.trim();
  if (!query) return [];

  const like = `%${query}%`;
  const limit = options.limit ?? 8;
  const visibilityClause = options.isAuthenticated
    ? "1 = 1"
    : `
      NOT EXISTS (
        SELECT 1
        FROM site_tags hidden_link
        JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
        WHERE hidden_link.site_id = s.id
          AND hidden_tag.is_hidden = 1
      )
    `;

  const siteRows = db
    .prepare(
      `
      SELECT DISTINCT s.name AS value, 'site' AS kind, s.updated_at AS sort_at
      FROM sites s
      WHERE ${visibilityClause}
        AND (s.name LIKE ? OR s.description LIKE ?)
      ORDER BY s.is_pinned DESC, s.global_sort_order ASC, s.updated_at DESC
      LIMIT ?
      `,
    )
    .all(like, like, limit) as Array<{ value: string; kind: "site"; sort_at: string }>;

  const remaining = Math.max(limit - siteRows.length, 0);
  const tagRows =
    remaining > 0
      ? (db
          .prepare(
            `
            SELECT DISTINCT t.name AS value, 'tag' AS kind, CAST(t.sort_order AS TEXT) AS sort_at
            FROM tags t
            WHERE ${options.isAuthenticated ? "1 = 1" : "t.is_hidden = 0"}
              AND t.name LIKE ?
            ORDER BY t.sort_order ASC, t.name COLLATE NOCASE ASC
            LIMIT ?
            `,
          )
          .all(like, remaining) as Array<{ value: string; kind: "tag"; sort_at: string }>)
      : [];

  const deduped = new Set<string>();
  const items: Array<{ value: string; kind: "site" | "tag" }> = [];

  for (const row of [...siteRows, ...tagRows]) {
    const normalized = row.value.trim();
    if (!normalized || deduped.has(normalized)) {
      continue;
    }
    deduped.add(normalized);
    items.push({ value: normalized, kind: row.kind });
    if (items.length >= limit) break;
  }

  return items;
}
