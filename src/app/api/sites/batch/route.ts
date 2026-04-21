/**
 * 批量创建网站 API
 * @description 从书签导入结果批量创建网站和标签
 */

import { requireAdminSession } from "@/lib/base/auth";
import { createSite, createTag } from "@/lib/services";
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
    await requireAdminSession();

    const body = (await request.json()) as { items?: BatchItem[] };
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return jsonError("没有可导入的网站");
    }

    logger.info("开始批量创建网站", { count: items.length });

    let created = 0;
    const tagIdCache = new Map<string, string>();

    for (const item of items) {
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
            isHidden: false,
            logoUrl: null,
            logoBgColor: null,
            description: null,
          });
          tagIdCache.set(tagName, tag.id);
          resolvedTagIds.push(tag.id);
        } catch {
          logger.warning("创建标签失败，跳过", { tagName });
        }
      }

      // 创建网站
      try {
        createSite({
          name: item.name,
          url: item.url,
          description: item.description || null,
          iconUrl: item.iconUrl || null,
          iconBgColor: item.iconBgColor || "transparent",
          isPinned: false,
          skipOnlineCheck: item.skipOnlineCheck,
          tagIds: resolvedTagIds,
        });
        created++;
      } catch (error) {
        logger.warning("创建网站失败，跳过", {
          name: item.name,
          url: item.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("批量创建完成", { total: items.length, created });

    return jsonOk({
      ok: true,
      total: items.length,
      created,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    logger.error("批量创建失败", error);
    return jsonError(error instanceof Error ? error.message : "批量创建失败", 500);
  }
}
