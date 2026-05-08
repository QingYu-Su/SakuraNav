/**
 * 数据可移植性服务
 * @description 提供可扩展、隐私安全、防篡改的用户数据导出和导入功能
 *
 * 设计原则：
 * 1. **可扩展** — 导出/导入使用原始数据库行，自动包含新增列，无需手动维护字段映射
 * 2. **隐私安全** — 表白名单 + 列黑名单双重保护，确保不泄露用户隐私数据
 * 3. **数据完整性** — 使用 HMAC-SHA256 对导出数据签名，防止篡改和伪装
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDb, type DatabaseAdapter } from "@/lib/database";
import { extractAssetIdFromUrl } from "@/lib/utils/icon-utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("DataPortability");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

// ──────────────────────────────────────
// 隐私保护配置
// ──────────────────────────────────────

/**
 * 允许导出的表（白名单）
 * @description 只有在此列表中的表才会被导出，防止未来新增的隐私表意外泄露
 */
const EXPORTABLE_TABLES = new Set([
  "tags",
  "sites",
  "site_tags",
  "site_relations",
]);

/**
 * 绝对禁止导出的列名（黑名单）
 * @description 无论出现在哪个表中，这些列永远不会被导出。
 * 即便后续代码变更新增了这些列名，保护逻辑依然生效。
 */
const PRIVACY_COLUMN_DENYLIST = new Set([
  "owner_id",            // 重新分配，不导出
  "password_hash",       // 密码哈希
  "avatar_asset_id",     // 用户头像
  "avatar_color",        // 头像颜色
  "nickname",            // 用户昵称
  "username_changed",    // 用户名修改记录
  "has_password",        // 密码状态
  "user_id",             // 用户关联 ID
]);

/**
 * 运行时状态列（不应导出，导入时重建）
 * @description 这些列的值是运行时计算/追踪的，不需要在导出中保留
 */
const RUNTIME_STATE_COLUMNS = new Set([
  "is_online",               // 在线状态
  "online_check_last_run",   // 上次检测时间
  "online_check_fail_count", // 连续失败计数
  "search_text",             // 搜索文本缓存
  "pending_context_gen",     // 上下文生成中标记
  "pending_ai_analysis",     // AI 分析中标记
]);

/** 合并黑名单：隐私列 + 运行时状态列 */
const ALL_EXCLUDED_COLUMNS = new Set([...PRIVACY_COLUMN_DENYLIST, ...RUNTIME_STATE_COLUMNS]);

// ──────────────────────────────────────
// HMAC 签名与校验
// ──────────────────────────────────────

/**
 * 获取签名密钥
 * @description 使用服务端 session secret 作为 HMAC 密钥
 * 这个值在同一个 SakuraNav 实例中是固定的，但不同实例间不同
 * 因此：同一实例导出的文件可以在同一实例导入，跨实例则不行（这也是安全特性）
 */
function getSigningSecret(): string {
  // 动态引入避免在客户端被引用
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { serverConfig } = require("@/lib/config/server-config");
  return serverConfig.sessionSecret;
}

/**
 * 对数据 JSON 字符串计算 HMAC-SHA256 签名
 * @param dataJsonString 序列化后的 data.json 内容
 * @returns 十六进制格式的签名
 */
export function computeDataSignature(dataJsonString: string): string {
  const secret = getSigningSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(dataJsonString, "utf-8")
    .digest("hex");
}

/**
 * 校验数据签名
 * @param dataJsonString 待校验的 data.json 内容
 * @param expectedSignature manifest 中记录的签名
 * @returns 校验是否通过
 */
export function verifyDataSignature(dataJsonString: string, expectedSignature: string): boolean {
  const actual = computeDataSignature(dataJsonString);
  try {
    // 使用时间安全的比较防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(actual, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    // 长度不匹配等情况
    return false;
  }
}

// ──────────────────────────────────────
// 导出辅助函数
// ──────────────────────────────────────

/**
 * 从原始数据库行中过滤列
 * @description 移除黑名单列，确保导出数据的安全性
 */
function filterRow(row: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!ALL_EXCLUDED_COLUMNS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * 获取指定表的列名列表
 */
export async function getTableColumns(db: DatabaseAdapter, tableName: string): Promise<string[]> {
  return db.getTableColumns(tableName);
}

/**
 * 收集行数据中引用的所有 asset ID
 * 支持多种 URL 格式：/api/assets/{id}/file、/api/cards/note/img/{id}、/api/cards/note/file/{id}
 */
/**
 * 重映射笔记内容中的 asset URL（图片和文件）
 * 同时覆盖 /api/cards/note/img/{id} 和 /api/cards/note/file/{id}
 */
function remapNoteAssetUrls(content: string, assetIdMap: Map<string, string>): string {
  return content.replace(
    /\/api\/cards\/note\/(img|file)\/(asset-[^)/]+)/g,
    (_match, kind: string, oldId: string) => {
      const newId = assetIdMap.get(oldId);
      return newId ? `/api/cards/note/${kind}/${newId}` : `/api/cards/note/${kind}/${oldId}`;
    },
  );
}

function collectAssetIdsFromRows(rows: Array<Record<string, unknown>>): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (typeof value === "string") {
        // 匹配 /api/assets/asset-xxx/file 格式（可能在一个长字符串中出现多次）
        const assetRegex = /\/api\/assets\/(asset-[^/]+)\/file/g;
        let match: RegExpExecArray | null;
        while ((match = assetRegex.exec(value)) !== null) {
          ids.add(match[1]);
        }
        // 匹配 /api/cards/note/img/asset-xxx 格式（笔记图片）
        const noteImgRegex = /\/api\/cards\/note\/img\/(asset-[^)/]+)/g;
        while ((match = noteImgRegex.exec(value)) !== null) {
          ids.add(match[1]);
        }
        // 匹配 /api/cards/note/file/asset-xxx 格式（笔记文件）
        const noteFileRegex = /\/api\/cards\/note\/file\/(asset-[^)/]+)/g;
        while ((match = noteFileRegex.exec(value)) !== null) {
          ids.add(match[1]);
        }
        // 匹配纯 asset ID（如壁纸 asset_id 列）
        if (value.startsWith("asset-")) ids.add(value);
      }
    }
  }
  return [...ids];
}

// ──────────────────────────────────────
// 导出核心逻辑
// ──────────────────────────────────────

export type ExportDataResult = {
  /** 标签原始行 */
  tags: Array<Record<string, unknown>>;
  /** 站点原始行（含社交卡片） */
  sites: Array<Record<string, unknown>>;
  /** 站点-标签关联行 */
  site_tags: Array<Record<string, unknown>>;
  /** 站点关联推荐行 */
  site_relations: Array<Record<string, unknown>>;
  /** 需要打包的 asset ID 列表 */
  assetIds: string[];
};

/**
 * 收集用户的导出数据（可扩展版本）
 * @param ownerId 用户 ID
 * @param sitesOnly 是否仅导出普通网站卡片（不含社交卡片和笔记卡片）
 * @returns 导出数据对象
 *
 * 可扩展性说明：
 * - 使用 SELECT * 获取所有列，自动包含未来新增的列
 * - 只通过黑名单过滤敏感列，新增的非敏感列自动包含
 * - 导入时动态检测列是否存在，忽略不存在的列
 */
export async function collectExportData(ownerId: string, sitesOnly: boolean = false): Promise<ExportDataResult> {
  const db = await getDb();

  // 安全断言：确保白名单配置正常
  logger.info("开始收集导出数据", { ownerId, sitesOnly });
  if (!EXPORTABLE_TABLES.has("tags") || !EXPORTABLE_TABLES.has("sites")) {
    throw new Error("导出白名单配置异常");
  }

  // 1. 导出站点（sitesOnly 时仅导出非社交卡片的网站卡片）
  const siteRows = sitesOnly
    ? await db.query("SELECT * FROM sites WHERE owner_id = ? AND card_type IS NULL ORDER BY global_sort_order ASC", [ownerId])
    : await db.query("SELECT * FROM sites WHERE owner_id = ? ORDER BY global_sort_order ASC", [ownerId]);
  const sites = siteRows.map(filterRow);

  // 2. 导出标签（sitesOnly 时仅导出与网站卡片关联的标签）
  const siteIds = siteRows.map((r) => r.id as string);
  let tagRows: Array<Record<string, unknown>>;
  if (sitesOnly && siteIds.length > 0) {
    // 查询与这些站点关联的标签 ID
    const ph = siteIds.map(() => "?").join(",");
    const relatedTagIds = new Set(
      (await db.query<{ tag_id: string }>(`SELECT DISTINCT tag_id FROM site_tags WHERE site_id IN (${ph})`, siteIds)).map((r) => r.tag_id),
    );
    if (relatedTagIds.size > 0) {
      const tagPh = [...relatedTagIds].map(() => "?").join(",");
      tagRows = await db.query(`SELECT * FROM tags WHERE owner_id = ? AND id IN (${tagPh}) ORDER BY sort_order ASC`, [ownerId, ...relatedTagIds]);
    } else {
      tagRows = [];
    }
  } else {
    tagRows = await db.query("SELECT * FROM tags WHERE owner_id = ? ORDER BY sort_order ASC", [ownerId]);
  }
  const tags = tagRows.map(filterRow);

  // 3. 导出站点-标签关联（只导出属于该用户的站点关联）
  let siteTags: Array<Record<string, unknown>> = [];
  if (siteIds.length > 0) {
    const ph = siteIds.map(() => "?").join(",");
    siteTags = (await db.query(`SELECT * FROM site_tags WHERE site_id IN (${ph}) ORDER BY sort_order ASC`, siteIds)).map(filterRow);
  }

  // 3.5 导出站点关联推荐（只导出属于该用户的站点关联）
  let siteRelations: Array<Record<string, unknown>> = [];
  if (siteIds.length > 0) {
    const ph = siteIds.map(() => "?").join(",");
    siteRelations = (await db.query(
      `SELECT * FROM site_relations WHERE source_site_id IN (${ph}) ORDER BY sort_order ASC`,
      siteIds,
    )).map(filterRow);
  }

  // 4. 收集所有需要导出的 asset
  const allRows = [...tagRows, ...siteRows];
  const assetIds = collectAssetIdsFromRows(allRows);

  // 安全断言：确保导出数据不包含隐私列（双重检查）
  assertNoPrivacyLeak([...tags, ...sites, ...siteTags, ...siteRelations]);

  logger.info("导出数据收集完成", {
    tags: tags.length,
    sites: sites.length,
    siteTags: siteTags.length,
    siteRelations: siteRelations.length,
    assets: assetIds.length,
  });

  return { tags, sites, site_tags: siteTags, site_relations: siteRelations, assetIds };
}

/**
 * 隐私安全断言：确保导出数据中不包含隐私列
 */
function assertNoPrivacyLeak(rows: Array<Record<string, unknown>>): void {
  for (const row of rows) {
    for (const col of Object.keys(row)) {
      if (PRIVACY_COLUMN_DENYLIST.has(col) && col !== "owner_id") {
        logger.error("导出数据中检测到隐私列", { column: col });
        throw new Error(`数据导出安全检查失败：检测到隐私列 "${col}"`);
      }
    }
  }
}

// ──────────────────────────────────────
// 导入核心逻辑
// ──────────────────────────────────────

/**
 * 清理用户的旧数据和资源文件
 * @param ownerId 用户 ID
 * @param includeAppearance 是否同时清理外观数据
 */
export async function cleanUserDataForImport(ownerId: string, includeAppearance: boolean): Promise<void> {
  const db = await getDb();

  // 清理物理资源文件
  const uploadsDir = path.join(projectRoot, "storage", "uploads", ownerId);
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(uploadsDir, { recursive: true });

  await db.transaction(async () => {
    // 收集站点 ID 以清理关联
    const siteIds = await db.query<{ id: string }>("SELECT id FROM sites WHERE owner_id = ?", [ownerId]);
    const siteIdList = siteIds.map((s) => s.id);

    if (siteIdList.length > 0) {
      const ph = siteIdList.map(() => "?").join(",");
      await db.execute(`DELETE FROM site_tags WHERE site_id IN (${ph})`, siteIdList);
      await db.execute(`DELETE FROM site_relations WHERE source_site_id IN (${ph})`, siteIdList);
    }

    await db.execute("DELETE FROM sites WHERE owner_id = ?", [ownerId]);
    await db.execute("DELETE FROM tags WHERE owner_id = ?", [ownerId]);
    await db.execute("DELETE FROM notification_channels WHERE owner_id = ?", [ownerId]);

    if (includeAppearance) {
      // 清理旧壁纸资源
      const oldAppearances = await db.query<{
        desktop_wallpaper_asset_id: string | null;
        mobile_wallpaper_asset_id: string | null;
      }>(
        "SELECT desktop_wallpaper_asset_id, mobile_wallpaper_asset_id FROM theme_appearances WHERE owner_id = ?",
        [ownerId],
      );

      for (const row of oldAppearances) {
        for (const assetId of [row.desktop_wallpaper_asset_id, row.mobile_wallpaper_asset_id]) {
          if (assetId) await cleanupAsset(db, assetId);
        }
      }

      await db.execute("DELETE FROM theme_appearances WHERE owner_id = ?", [ownerId]);
    }

    // 清理该用户的所有 asset 记录
    await db.execute("DELETE FROM assets WHERE file_path LIKE ?", [`%${path.sep}uploads${path.sep}${ownerId}${path.sep}%`]);
  });

  logger.info("旧数据清理完成", { ownerId, includeAppearance });
}

/**
 * 仅清理用户的普通网站卡片和相关标签，保留社交卡片和外观配置
 * @param ownerId 用户 ID
 * @description 用于导入仅网站卡片类型的 SakuraNav 配置文件时，
 *   只删除普通网站卡片（card_type IS NULL）及其关联的标签
 */
export async function cleanNormalSitesDataForImport(ownerId: string): Promise<void> {
  const db = await getDb();

  // 收集所有普通网站卡片的 ID
  const normalSiteIds = await db.query<{ id: string }>("SELECT id FROM sites WHERE owner_id = ? AND card_type IS NULL", [ownerId]);
  const siteIdList = normalSiteIds.map((s) => s.id);

  // 收集这些网站关联的标签 ID
  const tagIdsToDelete = new Set<string>();
  if (siteIdList.length > 0) {
    const ph = siteIdList.map(() => "?").join(",");
    const relatedTags = await db.query<{ tag_id: string }>(
      `SELECT DISTINCT st.tag_id FROM site_tags st WHERE st.site_id IN (${ph})`,
      siteIdList,
    );
    for (const { tag_id } of relatedTags) {
      tagIdsToDelete.add(tag_id);
    }
  }

  await db.transaction(async () => {
    // 删除普通网站卡片的 site_tags 关联
    if (siteIdList.length > 0) {
      const ph = siteIdList.map(() => "?").join(",");
      await db.execute(`DELETE FROM site_tags WHERE site_id IN (${ph})`, siteIdList);
      await db.execute(`DELETE FROM site_relations WHERE source_site_id IN (${ph})`, siteIdList);
    }

    // 删除普通网站卡片
    await db.execute("DELETE FROM sites WHERE owner_id = ? AND card_type IS NULL", [ownerId]);

    // 删除相关标签（仅删除只被普通网站卡片使用的标签）
    for (const tagId of tagIdsToDelete) {
      // 检查该标签是否还有其他网站卡片关联（如社交卡片）
      const remainingCount = await db.queryOne<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM site_tags WHERE tag_id = ?",
        [tagId],
      );
      if (remainingCount!.cnt === 0) {
        await db.execute("DELETE FROM tags WHERE id = ?", [tagId]);
      }
    }

    // 清理该用户下与普通网站相关的 icon asset 文件
    // 注意：这里只清理 storage/uploads/{ownerId} 下的文件，社交卡片的资源不受影响
    // 由于无法精确区分哪些 asset 是普通网站的 icon，这里跳过 asset 清理
    // asset 清理可以在后续通过 cleanup API 触发
  });

  logger.info("普通网站卡片数据清理完成", { ownerId, sites: siteIdList.length, tags: tagIdsToDelete.size });
}

/** 删除 asset 记录和物理文件 */
async function cleanupAsset(db: DatabaseAdapter, assetId: string): Promise<void> {
  const row = await db.queryOne<{ file_path: string }>("SELECT file_path FROM assets WHERE id = ?", [assetId]);
  if (row?.file_path && fs.existsSync(row.file_path)) {
    fs.rmSync(row.file_path, { force: true });
  }
  await db.execute("DELETE FROM assets WHERE id = ?", [assetId]);
}

/**
 * 动态构建 INSERT 并运行
 * @description 只插入目标表中实际存在的列
 */
export async function dynamicInsert(
  db: DatabaseAdapter,
  tableName: string,
  row: Record<string, unknown>,
): Promise<void> {
  const schemaColumns = await getTableColumns(db, tableName);
  const schemaSet = new Set(schemaColumns);

  const filteredEntries = Object.entries(row).filter(([col]) => schemaSet.has(col));
  if (filteredEntries.length === 0) return;

  const cols = filteredEntries.map(([col]) => col);
  const vals = filteredEntries.map(([col]) => `@${col}`);
  const params = Object.fromEntries(filteredEntries);

  await db.execute(`INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${vals.join(", ")})`, params);
}

/**
 * 导入用户数据（可扩展版本）
 * @param ownerId 目标用户 ID
 * @param data 导入的数据
 * @param assetIdMap asset ID 映射（旧 → 新）
 *
 * 可扩展性说明：
 * - 动态检测目标表的列结构，只插入存在的列
 * - 导入数据中多余的列被自动忽略（向前兼容）
 * - 导入数据中缺少的列使用数据库默认值（向后兼容）
 */
export async function applyImportData(
  ownerId: string,
  data: {
    tags?: Array<Record<string, unknown>>;
    sites?: Array<Record<string, unknown>>;
    site_tags?: Array<Record<string, unknown>>;
    site_relations?: Array<Record<string, unknown>>;
    appearances?: Array<Record<string, unknown>> | null;
    notificationChannels?: Array<Record<string, unknown>>;
  },
  assetIdMap: Map<string, string>,
): Promise<void> {
  const db = await getDb();

  let tagCount = 0;
  let siteCount = 0;

  await db.transaction(async () => {
    // 1. 导入标签 — 生成新 ID，建立映射
    const tagIdMap = new Map<string, string>();
    for (const tagRow of (data.tags ?? [])) {
      const oldId = tagRow.id as string;
      const newId = `tag-${crypto.randomUUID()}`;
      tagIdMap.set(oldId, newId);

      const row: Record<string, unknown> = {};
      for (const [col, val] of Object.entries(tagRow)) {
        if (col === "id") {
          row[col] = newId;
        } else if (col === "owner_id") {
          row[col] = ownerId;
        } else {
          row[col] = val;
        }
      }
      // 确保 owner_id 存在
      row.owner_id = ownerId;
      row.id = newId;

      await dynamicInsert(db, "tags", row);
    }

    // 2. 导入站点 — 生成新 ID，映射 asset 引用
    const siteIdMap = new Map<string, string>();
    for (const siteRow of (data.sites ?? [])) {
      const oldId = siteRow.id as string;
      const newId = `site-${crypto.randomUUID()}`;
      siteIdMap.set(oldId, newId);

      const row: Record<string, unknown> = {};
      for (const [col, val] of Object.entries(siteRow)) {
        if (col === "id") {
          row[col] = newId;
        } else if (col === "owner_id") {
          row[col] = ownerId;
        } else if (col === "icon_url" && typeof val === "string") {
          // 映射 icon_url 中的 asset ID
          const oldAssetId = extractAssetIdFromUrl(val);
          if (oldAssetId) {
            const newAssetId = assetIdMap.get(oldAssetId);
            row[col] = newAssetId ? `/api/assets/${newAssetId}/file` : null;
          } else {
            row[col] = val;
          }
        } else if (col === "card_data" && typeof val === "string") {
          // 映射 card_data 中的 asset 引用（qrCodeUrl、笔记图片等）
          try {
            const payload = JSON.parse(val) as Record<string, unknown>;
            // 社交卡片 qrCodeUrl
            if (typeof payload.qrCodeUrl === "string") {
              const oldAssetId = extractAssetIdFromUrl(payload.qrCodeUrl);
              if (oldAssetId) {
                const newAssetId = assetIdMap.get(oldAssetId);
                payload.qrCodeUrl = newAssetId ? `/api/assets/${newAssetId}/file` : "";
              }
            }
            // 笔记卡片 content 中的图片引用（markdown 中的图片 URL）
            if (typeof payload.content === "string" && (payload.content.includes("/api/cards/note/img/") || payload.content.includes("/api/cards/note/file/"))) {
              payload.content = remapNoteAssetUrls(payload.content, assetIdMap);
            }
            row[col] = JSON.stringify(payload);
          } catch {
            row[col] = val;
          }
        } else {
          row[col] = val;
        }
      }

      // 确保必要字段
      row.id = newId;
      row.owner_id = ownerId;
      row.is_online = null;
      row.online_check_last_run = null;
      row.online_check_fail_count = 0;
      row.search_text = "";
      row.pending_context_gen = 0;
      row.pending_ai_analysis = 0;

      await dynamicInsert(db, "sites", row);
    }

    // 3. 导入站点-标签关联 — 使用映射后的 ID
    for (const stRow of (data.site_tags ?? [])) {
      const mappedSiteId = siteIdMap.get(stRow.site_id as string);
      const mappedTagId = tagIdMap.get(stRow.tag_id as string);
      if (!mappedSiteId || !mappedTagId) continue;

      await dynamicInsert(db, "site_tags", {
        site_id: mappedSiteId,
        tag_id: mappedTagId,
        sort_order: stRow.sort_order ?? 0,
      });
    }

    // 3.5 导入站点关联推荐 — 使用映射后的 site ID，生成新 relation ID
    for (const relRow of (data.site_relations ?? [])) {
      const mappedSourceId = siteIdMap.get(relRow.source_site_id as string);
      const mappedTargetId = siteIdMap.get(relRow.target_site_id as string);
      // 只导入源和目标都存在的关联（避免引用不存在的站点）
      if (!mappedSourceId || !mappedTargetId) continue;

      await dynamicInsert(db, "site_relations", {
        id: `rel-${crypto.randomUUID()}`,
        source_site_id: mappedSourceId,
        target_site_id: mappedTargetId,
        sort_order: relRow.sort_order ?? 0,
        is_enabled: relRow.is_enabled ?? 1,
        is_locked: relRow.is_locked ?? 0,
        source: relRow.source ?? "manual",
        reason: relRow.reason ?? "",
        created_at: relRow.created_at ?? new Date().toISOString(),
      });
    }

    // 4. 导入通知配置 — 生成新 ID，重新分配 owner_id
    for (const ncRow of (data.notificationChannels ?? [])) {
      const newId = `nc-${crypto.randomUUID()}`;
      const row: Record<string, unknown> = {};
      for (const [col, val] of Object.entries(ncRow)) {
        if (col === "id") {
          row[col] = newId;
        } else if (col === "owner_id") {
          row[col] = ownerId;
        } else {
          row[col] = val;
        }
      }
      row.id = newId;
      row.owner_id = ownerId;

      await dynamicInsert(db, "notification_channels", row);
    }

    // 5. 导入外观配置（仅当数据中包含外观时）— 动态构建，新增外观字段时自动跟随
    if (data.appearances && data.appearances.length > 0) {
      const themeSchemaCols = await getTableColumns(db, "theme_appearances");
      const themeSchemaSet = new Set(themeSchemaCols);

      for (const appRow of data.appearances) {
        const row: Record<string, unknown> = {};
        for (const [col, val] of Object.entries(appRow)) {
          if (col === "owner_id") {
            row[col] = ownerId;
          } else if ((col === "desktop_wallpaper_asset_id" || col === "mobile_wallpaper_asset_id") && typeof val === "string") {
            row[col] = assetIdMap.get(val) ?? null;
          } else {
            row[col] = val;
          }
        }
        row.owner_id = ownerId;

        const filteredEntries = Object.entries(row).filter(([col]) => themeSchemaSet.has(col));
        if (filteredEntries.length === 0) continue;

        const pkCols = new Set(["owner_id", "theme"]);
        const nonPkEntries = filteredEntries.filter(([col]) => !pkCols.has(col));

        const cols = filteredEntries.map(([col]) => col);
        const vals = filteredEntries.map(([col]) => `@${col}`);
        const updateSets = nonPkEntries.map(([col]) => `${col} = excluded.${col}`);
        const params = Object.fromEntries(filteredEntries);

        await db.execute(`
          INSERT INTO theme_appearances (${cols.join(", ")}) VALUES (${vals.join(", ")})
          ON CONFLICT(owner_id, theme) DO UPDATE SET
            ${updateSets.join(",\n")}
        `, params);
      }
    }

    // 5. 重建 search_text
    await rebuildSearchText(db, [...siteIdMap.values()]);

    tagCount = tagIdMap.size;
    siteCount = siteIdMap.size;
  });

  logger.info("数据导入完成", {
    ownerId,
    tags: tagCount,
    sites: siteCount,
  });
}

/** 重建指定站点的 search_text */
async function rebuildSearchText(db: DatabaseAdapter, siteIds: string[]): Promise<void> {
  for (const siteId of siteIds) {
    const row = await db.queryOne<{
      name: string; description: string | null; notes: string | null;
      recommend_context: string | null; todos: string | null;
    }>(
      "SELECT name, description, notes, recommend_context, todos FROM sites WHERE id = ?",
      [siteId],
    );
    if (!row) continue;

    const tagRow = await db.queryOne<{ tagNames: string | null }>(`
      SELECT GROUP_CONCAT(t.name, ' ') AS tagNames
      FROM site_tags st JOIN tags t ON t.id = st.tag_id
      WHERE st.site_id = ?
    `, [siteId]);

    let todoText = "";
    try {
      const todos = JSON.parse(row.todos || "[]");
      if (Array.isArray(todos)) {
        todoText = todos.map((t: { text: string }) => t.text ?? "").join(" ");
      }
    } catch { /* ignore */ }

    const searchText = [
      row.name ?? "", row.description ?? "", row.notes ?? "",
      row.recommend_context ?? "", todoText, tagRow?.tagNames ?? "",
    ].join(" ").trim();

    await db.execute("UPDATE sites SET search_text = @searchText WHERE id = @id", { searchText, id: siteId });
  }
}
