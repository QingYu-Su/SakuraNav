/**
 * 笔记卡片管理 API 路由
 * @description 处理笔记卡片的增删改查操作（底层存储在 sites 表中，card_type = 'note'）
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { createSite, updateSite, deleteSite, deleteAllNoteCardSites, getNoteCardSites } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { siteToNoteCard } from "@/lib/base/types";

const logger = createLogger("API:Cards:Note");

/** 笔记卡片默认背景色 */
const NOTE_CARD_DEFAULT_COLOR = "#6366f1"; // indigo

export async function GET() {
  try {
    const session = await requireUserSession();
    logger.info("获取笔记卡片列表");
    const sites = getNoteCardSites(session.userId);
    const cards = sites.map(siteToNoteCard).filter((c): c is NonNullable<typeof c> => c != null);
    return jsonOk({ items: cards });
  } catch {
    logger.warning("获取笔记卡片列表失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = await request.json();
    const { title, content } = body;

    if (!content || !content.trim()) {
      return jsonError("请输入笔记内容");
    }

    // 如果没有标题，从内容中提取前几个字作为标题
    const displayTitle = (title && title.trim())
      ? title.trim()
      : content.trim().replace(/[#*\n\r]/g, "").slice(0, 20) + (content.trim().length > 20 ? "..." : "");

    const site = createSite({
      name: displayTitle,
      url: "#",
      description: null,
      iconUrl: null,
      iconBgColor: NOTE_CARD_DEFAULT_COLOR,
      isPinned: false,
      skipOnlineCheck: true,
      tagIds: [],
      cardType: "note",
      cardData: JSON.stringify({ title: title?.trim() || "", content: content.trim() }),
      ownerId: session.userId,
    });

    if (!site) return jsonError("创建失败", 500);
    const card = siteToNoteCard(site);
    logger.info("笔记卡片创建成功", { cardId: site.id });
    return jsonOk({ item: card });
  } catch (error) {
    logger.error("创建笔记卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return jsonError("卡片 ID 不能为空");
    }

    if (!content || !content.trim()) {
      return jsonError("请输入笔记内容");
    }

    const displayTitle = (title && title.trim())
      ? title.trim()
      : content.trim().replace(/[#*\n\r]/g, "").slice(0, 20) + (content.trim().length > 20 ? "..." : "");

    const site = updateSite({
      id,
      name: displayTitle,
      url: "#",
      description: null,
      iconUrl: null,
      iconBgColor: NOTE_CARD_DEFAULT_COLOR,
      isPinned: false,
      skipOnlineCheck: true,
      tagIds: [],
      cardType: "note",
      cardData: JSON.stringify({ title: title?.trim() || "", content: content.trim() }),
    });

    const card = site ? siteToNoteCard(site) : null;
    logger.info("笔记卡片更新成功", { cardId: id });
    return jsonOk({ item: card });
  } catch (error) {
    logger.error("更新笔记卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      deleteSite(id);
      logger.info("笔记卡片删除成功", { cardId: id });
    } else {
      deleteAllNoteCardSites(session.userId);
      logger.info("已删除全部笔记卡片");
    }

    return jsonOk({ ok: true });
  } catch {
    logger.warning("删除笔记卡片失败: 未授权");
    return jsonError("未授权", 401);
  }
}
