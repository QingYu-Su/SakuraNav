/**
 * @description 搜索服务 - 提供搜索建议功能
 */

import { getDb } from "@/lib/database";

export async function getSearchSuggestions(options: {
  query: string;
  isAuthenticated: boolean;
  limit?: number;
}): Promise<Array<{ value: string; kind: "site" | "tag" }>> {
  const db = await getDb();
  const query = options.query.trim();
  if (!query) return [];

  const like = `%${query}%`;
  const limit = options.limit ?? 8;
  const visibilityClause = options.isAuthenticated
    ? "1 = 1"
    : `
      NOT EXISTS (
        SELECT 1
        FROM card_tags hidden_link
        JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
        WHERE hidden_link.card_id = c.id
          AND hidden_tag.is_hidden = 1
      )
    `;

  const cardRows = await db.query<{ value: string; kind: "site"; sort_at: string }>(
    `
      SELECT DISTINCT c.name AS value, 'site' AS kind, c.updated_at AS sort_at
      FROM cards c
      WHERE ${visibilityClause}
        AND (c.name LIKE ? OR c.description LIKE ?)
      ORDER BY c.is_pinned DESC, c.global_sort_order ASC, c.updated_at DESC
      LIMIT ?
      `,
    [like, like, limit],
  );

  const remaining = Math.max(limit - cardRows.length, 0);
  const tagRows =
    remaining > 0
      ? await db.query<{ value: string; kind: "tag"; sort_at: string }>(
          `
            SELECT DISTINCT t.name AS value, 'tag' AS kind, CAST(t.sort_order AS TEXT) AS sort_at
            FROM tags t
            WHERE ${options.isAuthenticated ? "1 = 1" : "t.is_hidden = 0"}
              AND t.name LIKE ?
            ORDER BY t.sort_order ASC, t.name COLLATE NOCASE ASC
            LIMIT ?
            `,
          [like, remaining],
        )
      : [];

  const deduped = new Set<string>();
  const items: Array<{ value: string; kind: "site" | "tag" }> = [];

  for (const row of [...cardRows, ...tagRows]) {
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
