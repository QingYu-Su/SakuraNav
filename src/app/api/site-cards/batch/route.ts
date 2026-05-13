/**
* 批量创建网站卡片 API
* @description 从书签导入结果批量创建网站卡片和标签，支持三种导入模式
*/

import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { createCard, createTag, deleteAllSiteCards, deleteCard, getAllSiteCardUrls } from "@/lib/services";
import type { ImportMode } from "@/lib/base/types";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:SiteCards:Batch");

type BatchItem = {
  name: string;
  siteUrl: string;
  siteDescription: string;
  iconUrl: string;
  iconBgColor: string;
  siteSkipOnlineCheck: boolean;
  siteOnlineCheckFrequency: string;
  siteOnlineCheckTimeout?: number;
  siteOnlineCheckMatchMode?: string;
  siteOnlineCheckKeyword?: string;
  siteOnlineCheckFailThreshold?: number;
  tagIds: string[];
  newTags: string[];
};

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);

    const body = (await request.json()) as { items?: BatchItem[]; importMode?: ImportMode; allowDuplicates?: boolean };
    const items = body.items;
    const mode: ImportMode = body.importMode ?? "incremental";
    const allowDuplicates = body.allowDuplicates === true;

    if (!Array.isArray(items) || items.length === 0) {
      return jsonError("没有可导入的网站卡片");
    }

    if (!["clean", "incremental", "overwrite"].includes(mode)) {
      return jsonError("无效的导入模式");
    }

    logger.info("开始批量创建网站卡片", { count: items.length, mode, allowDuplicates });

    // 获取当前用户空间的卡片 URL（用于增量/覆盖模式去重）
    const existingCards = mode !== "clean" ? await getAllSiteCardUrls(ownerId) : [];
    const existingUrlMap = new Map<string, string>();
    for (const s of existingCards) {
      existingUrlMap.set(s.site_url.toLowerCase(), s.id);
    }

    // 清除后导入：先删除所有普通网站卡片
    if (mode === "clean") {
      logger.info("清除模式：删除所有普通网站卡片");
      await deleteAllSiteCards(session.userId);
    }

    let created = 0;
    let skipped = 0;
    let updated = 0;
    const createdCardIds: string[] = [];
    const tagIdCache = new Map<string, string>();

    for (const item of items) {
      const urlLower = item.siteUrl.toLowerCase();
      const existingId = existingUrlMap.get(urlLower);

      if (existingId && !allowDuplicates) {
        if (mode === "incremental") {
          // 增量模式：跳过已有卡片
          skipped++;
          continue;
        }
        if (mode === "overwrite") {
          // 覆盖模式：删除旧卡片后重新创建
          await deleteCard(existingId);
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
          const tag = await createTag({
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

      // 创建网站卡片
      try {
        const card = await createCard({
          name: item.name,
          siteUrl: item.siteUrl,
          siteDescription: item.siteDescription || null,
          iconUrl: item.iconUrl || null,
          iconBgColor: item.iconBgColor || "transparent",
          siteIsPinned: false,
          siteSkipOnlineCheck: item.siteSkipOnlineCheck,
          siteOnlineCheckFrequency: (item.siteOnlineCheckFrequency || "1d") as "5min" | "1h" | "1d",
          siteOnlineCheckTimeout: item.siteOnlineCheckTimeout ?? 3,
          siteOnlineCheckMatchMode: (item.siteOnlineCheckMatchMode ?? "status") as "status" | "keyword",
          siteOnlineCheckKeyword: item.siteOnlineCheckKeyword ?? "",
          siteOnlineCheckFailThreshold: item.siteOnlineCheckFailThreshold ?? 3,
          tagIds: resolvedTagIds,
          ownerId: session.userId,
        });
        created++;
        if (card) createdCardIds.push(card.id);
        if (existingId) updated++;
      } catch (error) {
        logger.warning("创建网站卡片失败，跳过", {
          name: item.name,
          url: item.siteUrl,
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
      createdCardIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    logger.error("批量创建失败", error);
    const msg = error instanceof Error ? error.message : "批量创建失败";
    const friendlyMsg = msg.includes("FOREIGN KEY") ? "关联数据异常，请刷新页面后重试" : msg;
    return jsonError(friendlyMsg, 500);
  }
}
