/**
 * 用户数据导入 API 路由
 * @description 从 ZIP 包导入数据到当前用户的数据空间
 * 仅支持 v5 格式（可扩展原始行格式），使用 HMAC-SHA256 校验数据完整性
 * 自动检测导出数据是否包含外观，无外观时保留当前外观配置
 */

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getDb } from "@/lib/database";
import {
  getVisibleTags,
  getAllSitesForAdmin,
  getAppearances,
  getAppSettings,
  createAsset,
  applyImportData,
  cleanUserDataForImport,
  cleanNormalSitesDataForImport,
  verifyDataSignature,
  getTableColumns,
  dynamicInsert,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { ImportMode, SocialCardType } from "@/lib/base/types";
import { SAKURA_MANIFEST_KEY, SOCIAL_CARD_TYPE_META } from "@/lib/base/types";
import { extractAssetIdFromUrl } from "@/lib/utils/icon-utils";

const logger = createLogger("API:UserData:Import");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

// ──────────────────────────────────────
// v5 Manifest 类型
// ──────────────────────────────────────

type V5Manifest = {
  signature: string;
  version: number;
  scope?: string;
  hasAppearance?: boolean;
  sitesOnly?: boolean;
  exportedAt?: string;
  /** HMAC-SHA256 签名 */
  dataSignature?: string;
};

// ──────────────────────────────────────
// 资源导入
// ──────────────────────────────────────

/**
 * 从 ZIP 中提取资源文件到 uploads 目录并创建 asset 记录
 * @returns 资源 ID 映射（旧 ID → 新 ID）
 */
async function importAssetFilesAsync(zip: JSZip, ownerId: string): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  const uploadsDir = path.join(projectRoot, "storage", "uploads", ownerId);
  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    if (!relativePath.startsWith("assets/")) continue;

    const basename = path.basename(relativePath);
    const ext = path.extname(basename);
    const originalId = path.basename(basename, ext);

    const fileBuffer = await zipEntry.async("nodebuffer");

    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext.toLowerCase()] ?? "image/jpeg";

    const asset = createAsset({
      kind: "wallpaper",
      filePath: "",
      mimeType,
    });

    const fileName = `${asset.id}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);

    const db = getDb();
    db.prepare("UPDATE assets SET file_path = ? WHERE id = ?").run(filePath, asset.id);

    idMap.set(originalId, asset.id);
  }
  return idMap;
}

// ──────────────────────────────────────
// 主入口
// ──────────────────────────────────────

/**
 * 返回导入成功后的 AdminBootstrap 数据
 */
function buildBootstrapResponse(ownerId: string) {
  return jsonOk({
    ok: true,
    tags: getVisibleTags(ownerId),
    sites: getAllSitesForAdmin(),
    appearances: getAppearances(ownerId),
    settings: getAppSettings(),
  });
}

/**
 * 导入用户数据
 */
export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始导入用户数据", { ownerId });

    const formData = await request.formData();
    const file = formData.get("file");
    const mode = (formData.get("mode") as ImportMode | null) ?? "clean";

    if (!(file instanceof File)) {
      return jsonError("请先选择配置文件");
    }
    if (!["clean", "incremental", "overwrite"].includes(mode)) {
      return jsonError("无效的导入模式");
    }

    logger.info("正在解析用户数据文件", { filename: file.name, mode });

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    // ── 1. 读取并校验 manifest ──
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      return jsonError("无效的导入文件：缺少 manifest");
    }

    const manifest = JSON.parse(await manifestFile.async("string")) as V5Manifest;

    // 校验签名标识
    if (manifest.signature !== SAKURA_MANIFEST_KEY) {
      return jsonError("无法识别的导入文件格式");
    }

    // 校验版本号（仅支持 v5）
    if (manifest.version < 5) {
      return jsonError("导入文件版本过旧，请使用新版 SakuraNav 导出的文件");
    }

    // ── 2. 读取 data.json ──
    const dataFile = zip.file("data.json");
    if (!dataFile) {
      return jsonError("导入文件中缺少数据文件");
    }

    const rawDataString = await dataFile.async("string");

    // ── 3. HMAC 签名校验 ──
    if (!manifest.dataSignature) {
      logger.warning("导入文件缺少数据签名", { version: manifest.version });
      return jsonError("导入文件缺少数据签名，文件可能已被篡改或损坏");
    }

    const signatureValid = verifyDataSignature(rawDataString, manifest.dataSignature);
    if (!signatureValid) {
      logger.error("导入文件数据签名校验失败", { ownerId });
      return jsonError("数据签名校验失败，文件可能已被篡改或损坏");
    }

    logger.info("数据签名校验通过");

    // ── 4. 解析数据 ──
    const rawData = JSON.parse(rawDataString);

    // 检测是否为仅网站卡片的导出
    const isSitesOnly = manifest.sitesOnly === true;

    // 检测是否包含外观数据
    const hasAppearance = !isSitesOnly
      && manifest.hasAppearance === true
      && rawData.appearances != null
      && Array.isArray(rawData.appearances)
      && rawData.appearances.length > 0;

    const v5Data = {
      tags: rawData.tags as Array<Record<string, unknown>> | undefined,
      sites: rawData.sites as Array<Record<string, unknown>> | undefined,
      site_tags: rawData.site_tags as Array<Record<string, unknown>> | undefined,
      appearances: hasAppearance ? (rawData.appearances as Array<Record<string, unknown>>) : null,
    };

    logger.info("数据格式检测", {
      version: manifest.version,
      hasAppearance,
      isSitesOnly,
      tags: v5Data.tags?.length ?? 0,
      sites: v5Data.sites?.length ?? 0,
    });

    // ── 5. 执行导入 ──
    // clean 模式：先清空旧数据
    if (mode === "clean") {
      if (isSitesOnly) {
        // 仅网站卡片模式：只清除普通网站卡片和相关标签，保留社交卡片和外观
        cleanNormalSitesDataForImport(ownerId);
      } else {
        cleanUserDataForImport(ownerId, hasAppearance);
      }
    }

    // 提取资源文件
    const assetIdMap = await importAssetFilesAsync(zip, ownerId);

    if (mode === "clean") {
      applyImportData(ownerId, v5Data, assetIdMap);
      logger.info("用户数据导入成功（clean 模式）");
    } else {
      // 增量/覆盖模式
      importMergeFromV5Data(ownerId, v5Data, mode, assetIdMap);
      logger.info("用户数据导入成功", { mode });
    }

    return buildBootstrapResponse(ownerId);
  } catch (error) {
    // 确保数据库连接可用
    try { getDb(); } catch { /* 忽略 */ }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("导入用户数据失败: 未授权");
      return jsonError("未授权", 401);
    }
    logger.error("导入用户数据失败", error);
    return jsonError(error instanceof Error ? error.message : "导入失败", 500);
  }
}

// ──────────────────────────────────────
// 增量/覆盖模式导入
// ──────────────────────────────────────

/**
 * 卡片唯一标识提取器（统一版本）
 *
 * 匹配策略：
 * - card_type 为空（普通网站）→ 按归一化 URL 匹配
 * - card_type 在 SOCIAL_CARD_TYPE_META 中（社交卡片）→ 按 meta.idField 提取值匹配
 * - card_type 未知（未来新卡片类型）→ 无匹配，增量导入时总是 INSERT
 *
 * 新增卡片类型时，在 SOCIAL_CARD_TYPE_META 或此处注册身份提取策略即可参与去重匹配
 */
function getCardIdentityKey(siteRow: Record<string, unknown>): string | null {
  const cardType = (siteRow.card_type as string) ?? null;

  if (!cardType) {
    // 普通网站：按归一化 URL 匹配
    const url = normalizeUrlForCompare((siteRow.url as string) ?? "");
    return url ? `url:${url}` : null;
  }

  // 社交卡片：由 SOCIAL_CARD_TYPE_META.idField 驱动
  const meta = SOCIAL_CARD_TYPE_META[cardType as SocialCardType];
  if (meta) {
    const cardData = (siteRow.card_data as string) ?? null;
    if (!cardData) return null;
    try {
      const payload = JSON.parse(cardData) as Record<string, unknown>;
      const value = payload[meta.idField];
      if (typeof value !== "string" || !value) return null;
      return `${cardType}:${meta.isUrl ? value.toLowerCase() : value}`;
    } catch {
      return null;
    }
  }

  // 未知卡片类型：无身份匹配 → 增量导入时总是 INSERT
  return null;
}

/** 映射 card_data JSON 中所有包含 /api/assets/ 的 asset URL 引用 */
function remapCardDataAssets(cardData: string | null, assetIdMap: Map<string, string>): string | null {
  if (!cardData) return null;
  try {
    const payload = JSON.parse(cardData) as Record<string, unknown>;
    let modified = false;
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string" && value.includes("/api/assets/")) {
        const oldAssetId = extractAssetIdFromUrl(value);
        if (oldAssetId && assetIdMap.has(oldAssetId)) {
          payload[key] = `/api/assets/${assetIdMap.get(oldAssetId)!}/file`;
          modified = true;
        }
      }
    }
    return modified ? JSON.stringify(payload) : cardData;
  } catch {
    return cardData;
  }
}

function normalizeUrlForCompare(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/** 映射 iconUrl 中的 asset ID */
function mapIconUrlAssetId(iconUrl: string | null, assetIdMap: Map<string, string>): string | null {
  if (!iconUrl) return null;
  const assetId = extractAssetIdFromUrl(iconUrl);
  if (!assetId) return iconUrl;
  const newAssetId = assetIdMap.get(assetId);
  if (newAssetId) return `/api/assets/${newAssetId}/file`;
  return null;
}

/** 删除指定 asset 对应的物理文件和数据库记录 */
function cleanupAssetById(db: ReturnType<typeof getDb>, assetId: string | null) {
  if (!assetId) return;
  const row = db.prepare("SELECT file_path FROM assets WHERE id = ?").get(assetId) as { file_path: string } | undefined;
  if (row?.file_path && fs.existsSync(row.file_path)) {
    fs.rmSync(row.file_path, { force: true });
  }
  db.prepare("DELETE FROM assets WHERE id = ?").run(assetId);
}

/**
 * v5 格式数据的增量/覆盖导入
 */
function importMergeFromV5Data(
  ownerId: string,
  data: {
    tags?: Array<Record<string, unknown>>;
    sites?: Array<Record<string, unknown>>;
    site_tags?: Array<Record<string, unknown>>;
    appearances?: Array<Record<string, unknown>> | null;
  },
  mode: "incremental" | "overwrite",
  assetIdMap: Map<string, string>,
): void {
  const db = getDb();

  // 获取当前数据用于去重
  const currentTags = db.prepare("SELECT id, name, slug FROM tags WHERE owner_id = ?").all(ownerId) as Array<{
    id: string; name: string; slug: string;
  }>;
  const currentSites = db.prepare("SELECT id, url, card_type, card_data, icon_url FROM sites WHERE owner_id = ?").all(ownerId) as Array<{
    id: string; url: string; card_type: string | null; card_data: string | null; icon_url: string | null;
  }>;

  const currentTagNames = new Map(currentTags.map((t) => [t.name.toLowerCase(), t]));

  // 统一的卡片匹配映射：identity key → existing site
  // identity key 由 getCardIdentityKey 生成，格式为 "url:<normalizedUrl>" 或 "<cardType>:<uniqueId>"
  const currentCardMap = new Map<string, { id: string; icon_url: string | null }>();
  for (const site of currentSites) {
    const key = getCardIdentityKey(site as unknown as Record<string, unknown>);
    if (key) currentCardMap.set(key, { id: site.id, icon_url: site.icon_url });
  }

  // 构建 site_tags 映射：site_id → 标签关联列表
  const siteTagsMap = new Map<string, Array<{ tag_id: string; sort_order: number }>>();
  for (const st of (data.site_tags ?? [])) {
    const siteId = st.site_id as string;
    if (!siteTagsMap.has(siteId)) siteTagsMap.set(siteId, []);
    siteTagsMap.get(siteId)!.push({ tag_id: st.tag_id as string, sort_order: (st.sort_order as number) ?? 0 });
  }

  const tagIdMap = new Map<string, string>();

  // 处理标签
  db.transaction(() => {
    for (const tag of (data.tags ?? [])) {
      const name = (tag.name as string) ?? "";
      const nameLower = name.toLowerCase();
      const existing = currentTagNames.get(nameLower);

      if (existing) {
        tagIdMap.set(tag.id as string, existing.id);
        if (mode === "overwrite") {
          // 动态构建 UPDATE，自动跟随新增列
          const schemaCols = getTableColumns(db, "tags");
          const schemaSet = new Set(schemaCols);
          const updates: string[] = [];
          const params: Record<string, unknown> = { id: existing.id };
          for (const [col, val] of Object.entries(tag)) {
            if (col === "id" || col === "owner_id" || !schemaSet.has(col)) continue;
            updates.push(`${col} = @${col}`);
            params[col] = val;
          }
          if (updates.length > 0) {
            db.prepare(`UPDATE tags SET ${updates.join(", ")} WHERE id = @id`).run(params);
          }
        }
      } else {
        const newId = `tag-${crypto.randomUUID()}`;
        const orderRow = db
          .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags WHERE owner_id = ?")
          .get(ownerId) as { maxOrder: number };

        const row: Record<string, unknown> = { ...tag };
        row.id = newId;
        row.slug = (tag.slug as string) ?? name.toLowerCase();
        row.sort_order = orderRow.maxOrder + 1;
        row.is_hidden = (tag.is_hidden as number) ?? 0;
        row.owner_id = ownerId;
        dynamicInsert(db, "tags", row);

        tagIdMap.set(tag.id as string, newId);
        currentTagNames.set(nameLower, { id: newId, name, slug: (tag.slug as string) ?? "" });
      }
    }
  })();

  // 处理站点 — 统一的卡片匹配 + 动态 INSERT/UPDATE，新增卡片类型或字段时自动跟随
  db.transaction(() => {
    for (const site of (data.sites ?? [])) {
      const mappedIconUrl = mapIconUrlAssetId((site.icon_url as string) ?? null, assetIdMap);
      const identityKey = getCardIdentityKey(site);
      const existing = identityKey ? currentCardMap.get(identityKey) : null;

      if (existing) {
        if (mode === "overwrite") {
          // 清理旧 icon asset
          const oldAssetId = extractAssetIdFromUrl(existing.icon_url);
          const newAssetId = extractAssetIdFromUrl(mappedIconUrl);
          if (oldAssetId && newAssetId && oldAssetId !== newAssetId) {
            cleanupAssetById(db, oldAssetId);
          }

          // 动态 UPDATE，自动跟随新增列
          const schemaCols = getTableColumns(db, "sites");
          const schemaSet = new Set(schemaCols);
          const updates: string[] = [];
          const params: Record<string, unknown> = { id: existing.id, updatedAt: new Date().toISOString() };
          for (const [col, val] of Object.entries(site)) {
            if (col === "id" || col === "owner_id" || col === "is_online" || col === "search_text"
              || col.startsWith("online_check_") || col.startsWith("pending_") || !schemaSet.has(col)) continue;
            if (col === "icon_url") { params[col] = mappedIconUrl; updates.push(`${col} = @${col}`); }
            else if (col === "updated_at") { /* 使用当前时间 */ }
            else if (col === "card_data") { params[col] = remapCardDataAssets(val as string | null, assetIdMap); updates.push(`${col} = @${col}`); }
            else { params[col] = val; updates.push(`${col} = @${col}`); }
          }
          updates.push("updated_at = @updatedAt");
          if (updates.length > 0) {
            db.prepare(`UPDATE sites SET ${updates.join(", ")} WHERE id = @id`).run(params);
          }

          // 更新站点-标签关联
          const tagRefs = siteTagsMap.get(site.id as string) ?? [];
          const mappedTagIds = tagRefs.map((t) => tagIdMap.get(t.tag_id)).filter((id): id is string => id != null);
          db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(existing.id);
          mappedTagIds.forEach((tid, i) => {
            db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(existing.id, tid, i);
          });
        }
      } else {
        const newId = `site-${crypto.randomUUID()}`;
        const orderRow = db
          .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites WHERE owner_id = ?")
          .get(ownerId) as { maxOrder: number };
        const now = new Date().toISOString();

        const cardType = (site.card_type as string) ?? null;
        const row: Record<string, unknown> = { ...site };
        row.id = newId;
        row.url = cardType ? ((site.url as string) ?? "#") : (site.url as string);
        row.icon_url = mappedIconUrl;
        row.card_data = remapCardDataAssets((site.card_data as string) ?? null, assetIdMap);
        row.is_pinned = (site.is_pinned as number) ?? 0;
        row.global_sort_order = orderRow.maxOrder + 1;
        row.owner_id = ownerId;
        row.created_at = now;
        row.updated_at = now;
        row.is_online = null;
        row.skip_online_check = 0;
        row.search_text = "";
        dynamicInsert(db, "sites", row);

        // 插入站点-标签关联
        const tagRefs = siteTagsMap.get(site.id as string) ?? [];
        const mappedTagIds = tagRefs.map((t) => tagIdMap.get(t.tag_id)).filter((id): id is string => id != null);
        mappedTagIds.forEach((tid, i) => {
          db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(newId, tid, i);
        });
      }
    }
  })();

  // 导入外观配置（仅覆盖模式）— 动态构建，新增外观字段时自动跟随
  const importAppearances = data.appearances;
  if (importAppearances && importAppearances.length > 0 && mode === "overwrite") {
    const themeSchemaCols = getTableColumns(db, "theme_appearances");
    const themeSchemaSet = new Set(themeSchemaCols);

    db.transaction(() => {
      for (const appRow of importAppearances) {
        const theme = (appRow.theme as string) ?? "dark";

        // 清理旧壁纸资源
        const oldRow = db.prepare(
          "SELECT desktop_wallpaper_asset_id, mobile_wallpaper_asset_id FROM theme_appearances WHERE owner_id = ? AND theme = ?"
        ).get(ownerId, theme) as {
          desktop_wallpaper_asset_id: string | null;
          mobile_wallpaper_asset_id: string | null;
        } | undefined;

        if (oldRow) {
          for (const oldAssetId of [oldRow.desktop_wallpaper_asset_id, oldRow.mobile_wallpaper_asset_id]) {
            cleanupAssetById(db, oldAssetId);
          }
        }

        // 构建动态行，映射 asset 引用
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

        // 只保留表中实际存在的列
        const filteredEntries = Object.entries(row).filter(([col]) => themeSchemaSet.has(col));
        if (filteredEntries.length === 0) continue;

        // 分离主键列和更新列
        const pkCols = new Set(["owner_id", "theme"]);
        const nonPkEntries = filteredEntries.filter(([col]) => !pkCols.has(col));

        const insertCols = filteredEntries.map(([col]) => col);
        const insertVals = filteredEntries.map(([col]) => `@${col}`);
        const updateSets = nonPkEntries.map(([col]) => `${col} = excluded.${col}`);
        const params = Object.fromEntries(filteredEntries);

        db.prepare(`
          INSERT INTO theme_appearances (${insertCols.join(", ")})
          VALUES (${insertVals.join(", ")})
          ON CONFLICT(owner_id, theme) DO UPDATE SET
            ${updateSets.join(",\n")}
        `).run(params);
      }
    });
  }
}
