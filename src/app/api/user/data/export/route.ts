/**
 * 用户数据导出 API 路由
 * @description 导出当前用户的标签、站点、外观配置（含壁纸和站点图标资源）和应用设置为 ZIP 包
 */

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getVisibleTags,
  getPaginatedSites,
  getAppearances,
  getAppSettings,
  getAsset,
} from "@/lib/services";
import { jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { SAKURA_MANIFEST_KEY } from "@/lib/base/types";
import { extractAssetIdFromUrl } from "@/lib/utils/icon-utils";

const logger = createLogger("API:UserData:Export");

/**
 * 生成导出文件名
 */
function buildExportFilename(username: string) {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return `sakura-${username}-${parts.join("")}.zip`;
}

/** 收集外观中的壁纸资源 ID */
function collectWallpaperAssetIds(appearances: Record<string, { desktopWallpaperAssetId: string | null; mobileWallpaperAssetId: string | null }>): string[] {
  const ids: string[] = [];
  for (const theme of ["light", "dark"] as const) {
    const t = appearances[theme];
    if (t.desktopWallpaperAssetId) ids.push(t.desktopWallpaperAssetId);
    if (t.mobileWallpaperAssetId) ids.push(t.mobileWallpaperAssetId);
  }
  return ids;
}

/** 从站点列表中收集所有自定义图标资源 ID（URL 格式为 /api/assets/asset-xxx/file） */
function collectSiteIconAssetIds(sites: Array<{ iconUrl: string | null }>): string[] {
  const ids: string[] = [];
  for (const site of sites) {
    const assetId = extractAssetIdFromUrl(site.iconUrl);
    if (assetId) ids.push(assetId);
  }
  return ids;
}

/**
 * 导出当前用户的数据
 */
export async function POST() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始导出用户数据", { ownerId });

    // 获取用户的标签
    const tags = getVisibleTags(ownerId);

    // 获取用户的站点（全量）
    const sitesResult = getPaginatedSites({
      ownerId,
      scope: "all",
      cursor: undefined,
      query: undefined,
      tagId: undefined,
    });
    let allSites = sitesResult.items;
    let nextCursor = sitesResult.nextCursor;
    while (nextCursor) {
      const nextPage = getPaginatedSites({
        ownerId,
        scope: "all",
        cursor: nextCursor,
        query: undefined,
        tagId: undefined,
      });
      allSites = allSites.concat(nextPage.items);
      nextCursor = nextPage.nextCursor;
    }

    // 获取用户的外观配置
    const appearances = getAppearances(ownerId);

    // 获取应用设置（仅用户可见部分：在线检测）
    const settings = getAppSettings();

    // 构建 manifest
    const manifest = {
      signature: SAKURA_MANIFEST_KEY,
      version: 4,
      scope: "user" as const,
      exportedAt: new Date().toISOString(),
    };

    // 构建数据 JSON
    const exportData = {
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        sortOrder: t.sortOrder,
        isHidden: t.isHidden,
        logoUrl: t.logoUrl,
        logoBgColor: t.logoBgColor,
        description: t.description,
      })),
      sites: allSites.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        description: s.description,
        iconUrl: s.iconUrl,
        iconBgColor: s.iconBgColor,
        isPinned: s.isPinned,
        globalSortOrder: s.globalSortOrder,
        cardType: s.cardType,
        cardData: s.cardData,
        tags: s.tags.map((t) => ({ id: t.id, sortOrder: t.sortOrder })),
      })),
      appearances: {
        light: {
          desktopWallpaperAssetId: appearances.light.desktopWallpaperAssetId,
          mobileWallpaperAssetId: appearances.light.mobileWallpaperAssetId,
          fontPreset: appearances.light.fontPreset,
          fontSize: appearances.light.fontSize,
          overlayOpacity: appearances.light.overlayOpacity,
          textColor: appearances.light.textColor,
          desktopCardFrosted: appearances.light.desktopCardFrosted,
          mobileCardFrosted: appearances.light.mobileCardFrosted,
        },
        dark: {
          desktopWallpaperAssetId: appearances.dark.desktopWallpaperAssetId,
          mobileWallpaperAssetId: appearances.dark.mobileWallpaperAssetId,
          fontPreset: appearances.dark.fontPreset,
          fontSize: appearances.dark.fontSize,
          overlayOpacity: appearances.dark.overlayOpacity,
          textColor: appearances.dark.textColor,
          desktopCardFrosted: appearances.dark.desktopCardFrosted,
          mobileCardFrosted: appearances.dark.mobileCardFrosted,
        },
      },
      settings: {
        onlineCheckEnabled: settings.onlineCheckEnabled,
        onlineCheckTime: settings.onlineCheckTime,
      },
    };

    // 打包为 ZIP
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("data.json", JSON.stringify(exportData, null, 2));

    // 收集并打包所有需要导出的资源文件
    const wallpaperAssetIds = collectWallpaperAssetIds(appearances);
    const siteIconAssetIds = collectSiteIconAssetIds(allSites);
    const allAssetIds = [...new Set([...wallpaperAssetIds, ...siteIconAssetIds])];

    for (const assetId of allAssetIds) {
      const asset = getAsset(assetId);
      if (asset && fs.existsSync(asset.filePath)) {
        const fileBuffer = fs.readFileSync(asset.filePath);
        zip.file(`assets/${assetId}${path.extname(asset.filePath) || ""}`, fileBuffer);
      }
    }

    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    logger.info("用户数据导出成功", {
      ownerId,
      tags: tags.length,
      sites: allSites.length,
      wallpaperAssets: wallpaperAssetIds.length,
      siteIconAssets: siteIconAssetIds.length,
    });

    return new Response(Buffer.from(output), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${buildExportFilename(session.username)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("导出用户数据失败", error);
    return jsonError(error instanceof Error ? error.message : "导出失败", 500);
  }
}
