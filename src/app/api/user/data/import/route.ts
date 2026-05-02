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
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { ImportMode, ThemeMode } from "@/lib/base/types";
import { SAKURA_MANIFEST_KEY } from "@/lib/base/types";
import { fontPresets, themeAppearanceDefaults } from "@/lib/config/config";
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
 * 社交卡片唯一标识提取器
 */
function getSocialCardUniqueId(cardType: string, cardData: string | null): string | null {
  if (!cardData) return null;
  try {
    const payload = JSON.parse(cardData) as Record<string, unknown>;
    const type = payload.type as string;
    if (type !== cardType) return null;
    switch (cardType) {
      case "qq": return payload.qqNumber as string;
      case "wechat": return payload.wechatId as string;
      case "email": return payload.email as string;
      case "bilibili": return (payload.url as string)?.toLowerCase();
      case "github": return (payload.url as string)?.toLowerCase();
      case "blog": return (payload.url as string)?.toLowerCase();
      case "wechat-official": return payload.accountName as string;
      case "telegram": return (payload.url as string)?.toLowerCase();
      case "xiaohongshu": return payload.xhsId as string;
      case "douyin": return payload.douyinId as string;
      case "qq-group": return payload.groupNumber as string;
      case "enterprise-wechat": return payload.ewcId as string;
      default: return null;
    }
  } catch {
    return null;
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
  const currentSiteUrlMap = new Map(currentSites.filter((s) => !s.card_type).map((s) => [normalizeUrlForCompare(s.url), s]));

  const currentSocialCardMap = new Map<string, string>();
  for (const site of currentSites) {
    if (!site.card_type) continue;
    const uniqueId = getSocialCardUniqueId(site.card_type, site.card_data);
    if (uniqueId) currentSocialCardMap.set(`${site.card_type}:${uniqueId}`, site.id);
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
          db.prepare(
            "UPDATE tags SET name = @name, logo_url = @logoUrl, logo_bg_color = @logoBgColor, description = @description WHERE id = @id",
          ).run({
            name,
            logoUrl: (tag.logo_url as string) ?? null,
            logoBgColor: (tag.logo_bg_color as string) ?? null,
            description: (tag.description as string) ?? null,
            id: existing.id,
          });
        }
      } else {
        const newId = `tag-${crypto.randomUUID()}`;
        const orderRow = db
          .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags WHERE owner_id = ?")
          .get(ownerId) as { maxOrder: number };

        db.prepare(
          `INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
           VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description, @ownerId)`,
        ).run({
          id: newId, name, slug: (tag.slug as string) ?? name.toLowerCase(),
          sortOrder: orderRow.maxOrder + 1,
          isHidden: (tag.is_hidden as number) ?? 0,
          logoUrl: (tag.logo_url as string) ?? null,
          logoBgColor: (tag.logo_bg_color as string) ?? null,
          description: (tag.description as string) ?? null,
          ownerId,
        });
        tagIdMap.set(tag.id as string, newId);
        currentTagNames.set(nameLower, { id: newId, name, slug: (tag.slug as string) ?? "" });
      }
    }
  })();

  // 处理站点
  db.transaction(() => {
    for (const site of (data.sites ?? [])) {
      const mappedIconUrl = mapIconUrlAssetId((site.icon_url as string) ?? null, assetIdMap);
      const cardType = (site.card_type as string) ?? null;

      if (cardType) {
        // 社交卡片：按 cardType + 唯一 ID 匹配
        const cardData = (site.card_data as string) ?? null;
        const uniqueId = getSocialCardUniqueId(cardType, cardData);
        const matchKey = uniqueId ? `${cardType}:${uniqueId}` : null;
        const existingId = matchKey ? currentSocialCardMap.get(matchKey) : null;

        if (existingId) {
          if (mode === "overwrite") {
            const oldSiteRow = db.prepare("SELECT icon_url FROM sites WHERE id = ?").get(existingId) as { icon_url: string | null } | undefined;
            const oldAssetId = extractAssetIdFromUrl(oldSiteRow?.icon_url ?? null);
            const newAssetId = extractAssetIdFromUrl(mappedIconUrl);
            if (oldAssetId && newAssetId && oldAssetId !== newAssetId) {
              cleanupAssetById(db, oldAssetId);
            }

            db.prepare(
              `UPDATE sites SET name = @name, description = @description, icon_url = @iconUrl,
               icon_bg_color = @iconBgColor, card_data = @cardData, updated_at = @updatedAt WHERE id = @id`,
            ).run({
              name: site.name, description: (site.description as string) ?? null,
              iconUrl: mappedIconUrl, iconBgColor: (site.icon_bg_color as string) ?? null,
              cardData, updatedAt: new Date().toISOString(), id: existingId,
            });
          }
        } else {
          const newId = `site-${crypto.randomUUID()}`;
          const orderRow = db
            .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites WHERE owner_id = ?")
            .get(ownerId) as { maxOrder: number };
          const now = new Date().toISOString();
          db.prepare(
            `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
             skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
             VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, NULL,
             0, @isPinned, @sortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt)`,
          ).run({
            id: newId, name: site.name, url: (site.url as string) ?? "#",
            description: (site.description as string) ?? null,
            iconUrl: mappedIconUrl, iconBgColor: (site.icon_bg_color as string) ?? null,
            isPinned: (site.is_pinned as number) ?? 0,
            sortOrder: orderRow.maxOrder + 1, cardType, cardData,
            ownerId, createdAt: now, updatedAt: now,
          });
        }
      } else {
        // 普通网站：按 URL 匹配
        const urlNorm = normalizeUrlForCompare((site.url as string) ?? "");
        const existing = currentSiteUrlMap.get(urlNorm);

        if (existing) {
          if (mode === "overwrite") {
            const oldIconAssetId = extractAssetIdFromUrl(existing.icon_url);
            const newAssetId = extractAssetIdFromUrl(mappedIconUrl);
            if (oldIconAssetId && newAssetId && oldIconAssetId !== newAssetId) {
              cleanupAssetById(db, oldIconAssetId);
            }

            db.prepare(
              `UPDATE sites SET name = @name, description = @description, icon_url = @iconUrl,
               icon_bg_color = @iconBgColor, updated_at = @updatedAt WHERE id = @id`,
            ).run({
              name: site.name, description: (site.description as string) ?? null,
              iconUrl: mappedIconUrl, iconBgColor: (site.icon_bg_color as string) ?? null,
              updatedAt: new Date().toISOString(), id: existing.id,
            });

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
          db.prepare(
            `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
             skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
             VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, NULL,
             0, @isPinned, @sortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt)`,
          ).run({
            id: newId, name: site.name, url: site.url,
            description: (site.description as string) ?? null,
            iconUrl: mappedIconUrl, iconBgColor: (site.icon_bg_color as string) ?? null,
            isPinned: (site.is_pinned as number) ?? 0,
            sortOrder: orderRow.maxOrder + 1, cardType: null, cardData: null,
            ownerId, createdAt: now, updatedAt: now,
          });

          const tagRefs = siteTagsMap.get(site.id as string) ?? [];
          const mappedTagIds = tagRefs.map((t) => tagIdMap.get(t.tag_id)).filter((id): id is string => id != null);
          mappedTagIds.forEach((tid, i) => {
            db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(newId, tid, i);
          });

          currentSiteUrlMap.set(urlNorm, { id: newId, url: (site.url as string) ?? "", card_type: null, card_data: null, icon_url: mappedIconUrl });
        }
      }
    }
  })();

  // 导入外观配置（仅覆盖模式）
  if (data.appearances && data.appearances.length > 0 && mode === "overwrite") {
    const appearanceRows = data.appearances;
    db.transaction(() => {
      for (const appRow of appearanceRows) {
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

        const desktopId = (appRow.desktop_wallpaper_asset_id as string) ?? null;
        const mobileId = (appRow.mobile_wallpaper_asset_id as string) ?? null;
        const fontPreset = (appRow.font_preset as string) ?? "balanced";
        const fontSize = (appRow.font_size as number) ?? themeAppearanceDefaults[theme as ThemeMode].fontSize;
        const overlayOpacity = (appRow.overlay_opacity as number) ?? themeAppearanceDefaults[theme as ThemeMode].overlayOpacity;
        const textColor = (appRow.text_color as string) ?? themeAppearanceDefaults[theme as ThemeMode].textColor;
        const desktopFrosted = (appRow.desktop_card_frosted as number) ?? 0;
        const mobileFrosted = (appRow.mobile_card_frosted as number) ?? 0;

        db.prepare(`
          INSERT INTO theme_appearances (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
            mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
            logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
          VALUES (@ownerId, @theme, NULL, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
            @fontPreset, @fontSize, @overlayOpacity, @textColor,
            NULL, NULL, 0, @desktopCardFrosted, @mobileCardFrosted, 0)
          ON CONFLICT(owner_id, theme) DO UPDATE SET
            desktop_wallpaper_asset_id = excluded.desktop_wallpaper_asset_id,
            mobile_wallpaper_asset_id = excluded.mobile_wallpaper_asset_id,
            font_preset = excluded.font_preset,
            font_size = excluded.font_size,
            overlay_opacity = excluded.overlay_opacity,
            text_color = excluded.text_color,
            desktop_card_frosted = excluded.desktop_card_frosted,
            mobile_card_frosted = excluded.mobile_card_frosted
        `).run({
          ownerId, theme,
          desktopWallpaperAssetId: desktopId ? (assetIdMap.get(desktopId) ?? null) : null,
          mobileWallpaperAssetId: mobileId ? (assetIdMap.get(mobileId) ?? null) : null,
          fontPreset: fontPreset in fontPresets ? fontPreset : "balanced",
          fontSize, overlayOpacity, textColor,
          desktopCardFrosted: Number(desktopFrosted),
          mobileCardFrosted: Number(mobileFrosted),
        });
      }
    });
  }
}
