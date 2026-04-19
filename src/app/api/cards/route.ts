/**
 * 社交卡片管理 API 路由
 * @description 处理社交卡片的增删改查操作
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/base/auth";
import { createCard, deleteCard, deleteAllCards, getAllCards, updateCard } from "@/lib/services";
import { cardInputSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { SOCIAL_CARD_TYPE_META, type SocialCardType, type SocialCardPayload } from "@/lib/base/types";

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
    return jsonOk({ items: getAllCards() });
  } catch {
    logger.warning("获取社交卡片列表失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const parsed = cardInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warning("创建卡片失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "卡片数据不合法");
    }

    const { cardType, label, iconUrl, iconBgColor, payload: rawPayload } = parsed.data;
    const payload = extractPayload(cardType, rawPayload as Record<string, string | undefined>);
    if (!payload) {
      return jsonError(`请填写${SOCIAL_CARD_TYPE_META[cardType].label}的必要信息`);
    }

    const card = createCard({
      cardType,
      label: label || SOCIAL_CARD_TYPE_META[cardType].label,
      iconUrl: iconUrl || null,
      iconBgColor: iconBgColor || SOCIAL_CARD_TYPE_META[cardType].color,
      payload,
    });

    logger.info("卡片创建成功", { cardId: card.id, cardType });
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
    const parsed = cardInputSchema.extend({ id: z.string().min(1) }).safeParse(body);

    if (!parsed.success) {
      logger.warning("更新卡片失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "卡片数据不合法");
    }

    const { id, label, iconUrl, iconBgColor, payload: rawPayload, cardType } = parsed.data;
    const payload = extractPayload(cardType, rawPayload as Record<string, string | undefined>);
    if (!payload) {
      return jsonError(`请填写${SOCIAL_CARD_TYPE_META[cardType].label}的必要信息`);
    }

    const card = updateCard({
      id,
      label: label || SOCIAL_CARD_TYPE_META[cardType].label,
      iconUrl: iconUrl || null,
      iconBgColor: iconBgColor || SOCIAL_CARD_TYPE_META[cardType].color,
      payload,
    });

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
      // 删除单张卡片
      deleteCard(id);
      logger.info("卡片删除成功", { cardId: id });
    } else {
      // 删除全部卡片（社交标签删除时触发）
      deleteAllCards();
      logger.info("已删除全部社交卡片");
    }

    return jsonOk({ ok: true });
  } catch {
    logger.warning("删除卡片失败: 未授权");
    return jsonError("未授权", 401);
  }
}
