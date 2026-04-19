/**
 * 社交卡片管理 API 路由
 * @description 处理社交卡片的增删改查操作（底层存储在 sites 表中，card_type 非空）
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { createSite, updateSite, deleteSite, deleteAllSocialCardSites, getSocialCardSites } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { SOCIAL_CARD_TYPE_META, type SocialCardType, type SocialCardPayload, siteToSocialCard } from "@/lib/base/types";

const logger = createLogger("API:Cards");

/** 卡片输入数据中提取 payload 字段并验证 */
function extractPayload(cardType: SocialCardType, raw: Record<string, string | undefined>): SocialCardPayload | null {
  switch (cardType) {
    case "qq": {
      const qqNumber = raw.qqNumber?.trim();
      if (!qqNumber) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "qq", qqNumber, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "email": {
      const email = raw.email?.trim();
      if (!email) return null;
      return { type: "email", email };
    }
    case "bilibili": {
      const url = raw.url?.trim();
      if (!url) return null;
      const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      return { type: "bilibili", url: normalizedUrl };
    }
    case "github": {
      const url = raw.url?.trim();
      if (!url) return null;
      const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      return { type: "github", url: normalizedUrl };
    }
    default:
      return null;
  }
}

export async function GET() {
  try {
    await requireAdminSession();
    logger.info("获取社交卡片列表");
    const sites = getSocialCardSites();
    const cards = sites.map(siteToSocialCard).filter((c): c is NonNullable<typeof c> => c != null);
    return jsonOk({ items: cards });
  } catch {
    logger.warning("获取社交卡片列表失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const { cardType, label, iconUrl, iconBgColor, payload: rawPayload } = body;

    if (!cardType || !rawPayload) {
      return jsonError("卡片数据不合法");
    }

    const payload = extractPayload(cardType, rawPayload as Record<string, string | undefined>);
    if (!payload) {
      return jsonError(`请填写${SOCIAL_CARD_TYPE_META[cardType as SocialCardType]?.label ?? ""}的必要信息`);
    }

    const meta = SOCIAL_CARD_TYPE_META[cardType as SocialCardType];
    const site = createSite({
      name: label || meta.label,
      url: "#",
      iconUrl: iconUrl || null,
      iconBgColor: iconBgColor || meta.color,
      isPinned: false,
      skipOnlineCheck: true,
      tagIds: [],
      cardType: cardType as SocialCardType,
      cardData: JSON.stringify(payload),
    });

    if (!site) return jsonError("创建失败", 500);
    const card = siteToSocialCard(site);
    logger.info("卡片创建成功", { cardId: site.id, cardType });
    return jsonOk({ item: card });
  } catch (error) {
    logger.error("创建卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const { id, label, iconUrl, iconBgColor, payload: rawPayload, cardType } = body;

    if (!id || !cardType) {
      return jsonError("卡片数据不合法");
    }

    const payload = extractPayload(cardType, rawPayload as Record<string, string | undefined>);
    if (!payload) {
      return jsonError(`请填写${SOCIAL_CARD_TYPE_META[cardType as SocialCardType]?.label ?? ""}的必要信息`);
    }

    const meta = SOCIAL_CARD_TYPE_META[cardType as SocialCardType];
    const site = updateSite({
      id,
      name: label || meta.label,
      url: "#",
      iconUrl: iconUrl || null,
      iconBgColor: iconBgColor || meta.color,
      isPinned: false,
      skipOnlineCheck: true,
      tagIds: [],
      cardType: cardType as SocialCardType,
      cardData: JSON.stringify(payload),
    });

    const card = site ? siteToSocialCard(site) : null;
    logger.info("卡片更新成功", { cardId: id });
    return jsonOk({ item: card });
  } catch (error) {
    logger.error("更新卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminSession();
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      deleteSite(id);
      logger.info("卡片删除成功", { cardId: id });
    } else {
      deleteAllSocialCardSites();
      logger.info("已删除全部社交卡片");
    }

    return jsonOk({ ok: true });
  } catch {
    logger.warning("删除卡片失败: 未授权");
    return jsonError("未授权", 401);
  }
}
