/**
* 网站卡片管理 API 路由
* @description 处理网站卡片的增删改查操作，包括获取网站卡片列表、创建、更新和删除网站卡片
*/

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { createCard, deleteCard, getAllCardsForAdmin, updateCard, saveRelatedCards, addReverseRelation, performSingleSiteCardOnlineCheck } from "@/lib/services";
import { getCardById } from "@/lib/services/card-repository";
import { siteInputSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:SiteCards");

const cardUpdateSchema = siteInputSchema.extend({
  id: siteInputSchema.shape.name,
  originalUrl: z.string().optional(),
});

/** 从 iconUrl 中提取上传资源的 assetId（格式: /api/assets/{id}/file） */
function extractAssetIdFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith("/api/assets/")) return null;
  const match = url.match(/^\/api\/assets\/([^/]+)\/file$/);
  return match?.[1] ?? null;
}

export async function GET() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("获取网站卡片列表");
    return jsonOk({ items: await getAllCardsForAdmin(ownerId) });
  } catch {
    logger.warning("获取网站卡片列表失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const parsed = siteInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      logger.warning("创建网站卡片失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "卡片数据不合法");
    }

    const card = await createCard({
      ...parsed.data,
      siteDescription: parsed.data.siteDescription || "",
      iconUrl: parsed.data.iconUrl || null,
      iconBgColor: parsed.data.iconBgColor || null,
      siteOnlineCheckFrequency: parsed.data.siteOnlineCheckFrequency,
      siteOnlineCheckTimeout: parsed.data.siteOnlineCheckTimeout,
      siteOnlineCheckMatchMode: parsed.data.siteOnlineCheckMatchMode,
      siteOnlineCheckKeyword: parsed.data.siteOnlineCheckKeyword,
      siteOnlineCheckFailThreshold: parsed.data.siteOnlineCheckFailThreshold,
      siteAccessRules: parsed.data.siteAccessRules ?? null,
      siteRecommendContext: parsed.data.siteRecommendContext,
      siteAiRelationEnabled: parsed.data.siteAiRelationEnabled,
      ownerId: session.userId,
    });

    // 保存关联关系
    if (card?.id && parsed.data.siteRelatedSites.length > 0) {
      await saveRelatedCards(card.id, parsed.data.siteRelatedSites.map((rs, i) => ({
        cardId: rs.cardId,
        enabled: rs.enabled,
        sortOrder: i,
        source: rs.source,
        reason: rs.reason,
      })));

      // 对所有启用的关联建立反向关联（双向）
      for (const rs of parsed.data.siteRelatedSites) {
        if (rs.enabled) {
          await addReverseRelation(card.id, rs.cardId, rs.reason);
        }
      }
    }

    // 异步触发在线检查（不阻塞响应）
    if (!parsed.data.siteSkipOnlineCheck && card?.id) {
      performSingleSiteCardOnlineCheck(card.id).catch((err) => logger.error("API 创建后在线检查失败", err));
    }

    logger.info("网站卡片创建成功", { cardId: card?.id, name: card?.name });
    return jsonOk({ item: card ? await getCardById(card.id) : null });
  } catch (error) {
    logger.error("创建网站卡片失败", error);
    const msg = error instanceof Error ? error.message : "创建失败";
    // 将数据库原始错误翻译为用户友好的提示
    const friendlyMsg = msg.includes("FOREIGN KEY") ? "关联数据异常，请刷新页面后重试" : msg;
    return jsonError(friendlyMsg, 500);
  }
}

/**
* 更新网站卡片信息
* @param request - 包含更新数据的请求对象
* @returns 更新后的网站卡片数据
*/
export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const parsed = cardUpdateSchema.safeParse(await request.json());

    if (!parsed.success) {
      logger.warning("更新网站卡片失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "卡片数据不合法");
    }

    // 保存更新前的卡片数据，用于判断 URL 是否变更
    const oldCard = await getCardById(parsed.data.id);
    const card = await updateCard({
      ...parsed.data,
      id: parsed.data.id,
      siteDescription: parsed.data.siteDescription || "",
      iconUrl: parsed.data.iconUrl || null,
      iconBgColor: parsed.data.iconBgColor || null,
      siteOnlineCheckFrequency: parsed.data.siteOnlineCheckFrequency,
      siteOnlineCheckTimeout: parsed.data.siteOnlineCheckTimeout,
      siteOnlineCheckMatchMode: parsed.data.siteOnlineCheckMatchMode,
      siteOnlineCheckKeyword: parsed.data.siteOnlineCheckKeyword,
      siteOnlineCheckFailThreshold: parsed.data.siteOnlineCheckFailThreshold,
      siteAccessRules: parsed.data.siteAccessRules ?? null,
      siteRecommendContext: parsed.data.siteRecommendContext,
      siteAiRelationEnabled: parsed.data.siteAiRelationEnabled,
    });

    // 保存关联关系
    if (parsed.data.id) {
      await saveRelatedCards(parsed.data.id, parsed.data.siteRelatedSites.map((rs, i) => ({
        cardId: rs.cardId,
        enabled: rs.enabled,
        sortOrder: i,
        source: rs.source,
        reason: rs.reason,
      })));

      // 对所有启用的关联建立反向关联（双向）
      for (const rs of parsed.data.siteRelatedSites) {
        if (rs.enabled) {
          await addReverseRelation(parsed.data.id, rs.cardId, rs.reason);
        }
      }
    }

    // URL 变更或 siteSkipOnlineCheck 从 true→false 时触发在线检查
    const urlChanged = oldCard && oldCard.siteUrl !== parsed.data.siteUrl;
    const checkEnabled = oldCard?.siteSkipOnlineCheck && !parsed.data.siteSkipOnlineCheck;
    if (!parsed.data.siteSkipOnlineCheck && (urlChanged || checkEnabled) && parsed.data.id) {
      performSingleSiteCardOnlineCheck(parsed.data.id).catch((err) => logger.error("API 更新后在线检查失败", err));
    }

    logger.info("网站卡片更新成功", { cardId: card?.id, name: card?.name });
    return jsonOk({ item: card ? await getCardById(card.id) : null });
  } catch (error) {
    logger.error("更新网站卡片失败", error);
    const msg = error instanceof Error ? error.message : "更新失败";
    const friendlyMsg = msg.includes("FOREIGN KEY") ? "关联数据异常，请刷新页面后重试" : msg;
    return jsonError(friendlyMsg, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireUserSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      logger.warning("删除网站卡片失败: 缺少卡片 ID");
      return jsonError("缺少卡片 ID");
    }

    // 删除前获取卡片的自定义图标 assetId，返回给前端用于延迟删除
    const card = await getCardById(id);
    const iconAssetId = card ? extractAssetIdFromUrl(card.iconUrl) : null;

    await deleteCard(id);
    logger.info("网站卡片删除成功", { cardId: id });
    return jsonOk({ ok: true, iconAssetId });
  } catch {
    logger.warning("删除网站卡片失败: 未授权");
    return jsonError("未授权", 401);
  }
}
