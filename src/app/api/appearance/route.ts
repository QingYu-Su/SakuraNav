/**
 * 外观设置 API 路由
 * @description 处理外观配置的获取和更新请求，包括主题、壁纸等外观相关设置
 */

import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getAppearances, updateAppearances } from "@/lib/services";
import { getAsset, deleteAsset } from "@/lib/services/asset-repository";
import { appearanceSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Appearance");

export async function GET() {
  try {
    const session = await requireUserSession();
    return jsonOk(await getAppearances(getEffectiveOwnerId(session)));
  } catch {
    logger.warning("获取外观设置失败: 未授权");
    return jsonError("未授权", 401);
  }
}

/**
 * 清理不再被引用的旧资源文件
 * @description 比较更新前后的资产 ID，将被移除的资源文件和记录一并删除
 */
async function cleanupOrphanedAssets(
  oldAppearances: Record<string, { desktopWallpaperAssetId: string | null; mobileWallpaperAssetId: string | null; logoAssetId: string | null; faviconAssetId: string | null }>,
  newAppearances: Record<string, { desktopWallpaperAssetId?: string | null; mobileWallpaperAssetId?: string | null; logoAssetId?: string | null; faviconAssetId?: string | null }>,
) {
  const oldIds = new Set<string>();

  for (const mode of Object.keys(oldAppearances)) {
    const old = oldAppearances[mode];
    const nw = newAppearances[mode] ?? {};
    // 收集被移除的资产 ID（旧有 → 新无）
    for (const key of ["desktopWallpaperAssetId", "mobileWallpaperAssetId", "logoAssetId", "faviconAssetId"] as const) {
      const oldId = old[key];
      if (oldId && nw[key] !== oldId) oldIds.add(oldId);
    }
  }

  for (const assetId of oldIds) {
    const asset = await getAsset(assetId);
    if (asset) {
      try { await fs.unlink(asset.filePath); } catch { /* 文件可能已不存在 */ }
      await deleteAsset(asset.id);
      logger.info("清理孤立资源", { assetId });
    }
  }
}

/**
 * 更新外观配置
 * @param request - 包含新外观配置的请求对象
 * @returns 更新后的外观配置
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const parsed = appearanceSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("更新外观设置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "外观配置不合法");
    }

    const ownerId = getEffectiveOwnerId(session);

    // 获取更新前的外观数据，用于清理不再被引用的旧资源
    const oldAppearances = await getAppearances(ownerId);
    await updateAppearances(ownerId, parsed.data);

    // 清理被移除的资源文件
    await cleanupOrphanedAssets(oldAppearances, parsed.data);

    logger.info("外观设置更新成功", { ownerId });
    return jsonOk(await getAppearances(ownerId));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("更新外观设置失败: 未授权");
      return jsonError("未授权", 401);
    }
    logger.error("更新外观设置失败", error);
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
