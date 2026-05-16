/**
* 社交卡片管理 API 路由
* @description 处理社交卡片的增删改查操作（底层存储在 cards 表中，card_type 非空）
*/

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { createCard, updateCard, deleteCard, deleteAllSocialCards, getSocialCards } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { SOCIAL_CARD_TYPE_META, type SocialCardType, type SocialCardPayload, cardToSocialCard } from "@/lib/base/types";

const logger = createLogger("API:SocialCards");

/** 卡片输入数据中提取 payload 字段并验证 */
function extractPayload(cardType: SocialCardType, raw: Record<string, string | undefined>): SocialCardPayload | null {
  switch (cardType) {
    case "qq": {
      const qqNumber = raw.qqNumber?.trim();
      if (!qqNumber) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "qq", qqNumber, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "wechat": {
      const wechatId = raw.wechatId?.trim();
      if (!wechatId) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "wechat", wechatId, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "email": {
      const email = raw.email?.trim();
      if (!email) return null;
      return { type: "email", email };
    }
    case "bilibili": {
      const url = raw.url?.trim();
      if (!url) return null;
      return { type: "bilibili", url };
    }
    case "github": {
      const url = raw.url?.trim();
      if (!url) return null;
      return { type: "github", url };
    }
    case "blog": {
      const url = raw.url?.trim();
      if (!url) return null;
      return { type: "blog", url };
    }
    case "wechat-official": {
      const accountName = raw.accountName?.trim();
      if (!accountName) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "wechat-official", accountName, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "telegram": {
      const url = raw.url?.trim();
      if (!url) return null;
      return { type: "telegram", url };
    }
    case "xiaohongshu": {
      const xhsId = raw.xhsId?.trim();
      if (!xhsId) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "xiaohongshu", xhsId, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "douyin": {
      const douyinId = raw.douyinId?.trim();
      if (!douyinId) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "douyin", douyinId, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "qq-group": {
      const groupNumber = raw.groupNumber?.trim();
      if (!groupNumber) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "qq-group", groupNumber, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    case "enterprise-wechat": {
      const ewcId = raw.ewcId?.trim();
      if (!ewcId) return null;
      const qrCodeUrl = raw.qrCodeUrl?.trim();
      return { type: "enterprise-wechat", ewcId, ...(qrCodeUrl ? { qrCodeUrl } : {}) };
    }
    default:
      return null;
  }
}

export async function GET() {
  try {
    const session = await requireUserSession();
    logger.info("获取社交卡片列表");
    const cards = await getSocialCards(session.userId);
    const socialCards = cards.map(cardToSocialCard).filter((c): c is NonNullable<typeof c> => c != null);
    return jsonOk({ items: socialCards });
  } catch {
    logger.warning("获取社交卡片列表失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = await request.json();
    const { cardType, label, iconUrl, iconBgColor, hint, payload: rawPayload } = body;

    if (!cardType || !rawPayload) {
      return jsonError("卡片数据不合法");
    }

    const payload = extractPayload(cardType, rawPayload as Record<string, string | undefined>);
    if (!payload) {
      return jsonError(`请填写${SOCIAL_CARD_TYPE_META[cardType as SocialCardType]?.label ?? ""}的必要信息`);
    }

    const meta = SOCIAL_CARD_TYPE_META[cardType as SocialCardType];
    const card = await createCard({
      name: label || meta.label,
      siteUrl: "#",
      siteDescription: null,
      iconUrl: iconUrl || null,
      iconBgColor: iconBgColor || meta.color,
      siteIsPinned: false,
      siteSkipOnlineCheck: true,
      socialHint: typeof hint === "string" && hint.trim() ? hint.trim() : null,
      tagIds: [],
      cardType: cardType as SocialCardType,
      cardData: JSON.stringify(payload),
      ownerId: session.userId,
    });

    if (!card) return jsonError("创建失败", 500);
    const socialCard = cardToSocialCard(card);
    logger.info("卡片创建成功", { cardId: card.id, cardType });
    return jsonOk({ item: socialCard });
  } catch (error) {
    logger.error("创建卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const body = await request.json();
    const { id, label, iconUrl, iconBgColor, hint, payload: rawPayload, cardType } = body;

    if (!id || !cardType) {
      return jsonError("卡片数据不合法");
    }

    const payload = extractPayload(cardType, rawPayload as Record<string, string | undefined>);
    if (!payload) {
      return jsonError(`请填写${SOCIAL_CARD_TYPE_META[cardType as SocialCardType]?.label ?? ""}的必要信息`);
    }

    const meta = SOCIAL_CARD_TYPE_META[cardType as SocialCardType];
    const card = await updateCard({
      id,
      name: label || meta.label,
      siteUrl: "#",
      siteDescription: null,
      iconUrl: iconUrl || null,
      iconBgColor: iconBgColor || meta.color,
      siteIsPinned: false,
      siteSkipOnlineCheck: true,
      socialHint: typeof hint === "string" && hint.trim() ? hint.trim() : null,
      tagIds: [],
      cardType: cardType as SocialCardType,
      cardData: JSON.stringify(payload),
    });

    const socialCard = card ? cardToSocialCard(card) : null;
    logger.info("卡片更新成功", { cardId: id });
    return jsonOk({ item: socialCard, card });
  } catch (error) {
    logger.error("更新卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      await deleteCard(id);
      logger.info("卡片删除成功", { cardId: id });
    } else {
      await deleteAllSocialCards(session.userId);
      logger.info("已删除全部社交卡片");
    }

    return jsonOk({ ok: true });
  } catch {
    logger.warning("删除卡片失败: 未授权");
    return jsonError("未授权", 401);
  }
}
