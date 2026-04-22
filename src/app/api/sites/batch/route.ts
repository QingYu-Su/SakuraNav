/**
 * 批量创建网站 API
 * @description 从书签导入结果批量创建网站和标签，支持三种导入模式
 */

import { requireUserSession } from "@/lib/base/auth";
import { createSite, createTag, deleteAllNormalSites, deleteSite, getAllSiteUrls } from "@/lib/services";
import type { ImportMode } from "@/lib/base/types";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Sites:Batch");

type BatchItem = {
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  iconBgColor: string;
  skipOnlineCheck: boolean;
  tagIds: string[];
  newTags: string[];
};

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();

    const body = (await request.json()) as { items?: BatchItem[]; importMode?: ImportMode };
    const items = body.items;
    const mode: ImportMode = body.importMode ?? "incremental";

    if (!Array.isArray(items) || items.length === 0) {
      return jsonError("没有可导入的网站");
    }

    if (!["clean", "incremental", "overwrite"].includes(mode)) {
      return jsonError("无效的导入模式");
    }

    logger.info("开始批量创建网站", { count: items.length, mode });

    // 获取当前所有站点 URL（用于增量/覆盖模式去重）
    const existingSites = mode !== "clean" ? getAllSiteUrls() : [];
    const existingUrlMap = new Map<string, string>();
    for (const s of existingSites) {
      existingUrlMap.set(s.url.toLowerCase(), s.id);
    }

    // 清除后导入：先删除所有普通网站
    if (mode === "clean") {
      logger.info("清除模式：删除所有普通网站");
      deleteAllNormalSites(session.userId);
    }

    let created = 0;
    let skipped = 0;
    let updated = 0;
    const createdSiteIds: string[] = [];
    const tagIdCache = new Map<string, string>();

    for (const item of items) {
      const urlLower = item.url.toLowerCase();
      const existingId = existingUrlMap.get(urlLower);

      if (existingId) {
        if (mode === "incremental") {
          // 增量模式：跳过已有站点
          skipped++;
          continue;
        }
        if (mode === "overwrite") {
          // 覆盖模式：删除旧站点后重新创建
          deleteSite(existingId);
        }
      }

      // 创建新标签
      const resolvedTagIds: string[] = [...item.tagIds];

      for (const tagName of item.newTags) {
        const cached = tagIdCache.get(tagName);
        if (cached) {
          resolvedTagIds.push(cached);
          continue;
        }

        try {
          const tag = createTag({
            name: tagName,
            logoUrl: null,
            logoBgColor: null,
            description: null,
            ownerId: session.userId,
          });
          tagIdCache.set(tagName, tag.id);
          resolvedTagIds.push(tag.id);
        } catch {
          logger.warning("创建标签失败，跳过", { tagName });
        }
      }

      // 创建网站
      try {
        const site = createSite({
          name: item.name,
          url: item.url,
          description: item.description || null,
          iconUrl: item.iconUrl || null,
          iconBgColor: item.iconBgColor || "transparent",
          isPinned: false,
          skipOnlineCheck: item.skipOnlineCheck,
          tagIds: resolvedTagIds,
          ownerId: session.userId,
        });
        created++;
        if (site) createdSiteIds.push(site.id);
        if (existingId) updated++;
      } catch (error) {
        logger.warning("创建网站失败，跳过", {
          name: item.name,
          url: item.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("批量创建完成", { total: items.length, created, skipped, updated, mode });

    return jsonOk({
      ok: true,
      total: items.length,
      created,
      skipped,
      updated,
      createdSiteIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    logger.error("批量创建失败", error);
    return jsonError(error instanceof Error ? error.message : "批量创建失败", 500);
  }
}
