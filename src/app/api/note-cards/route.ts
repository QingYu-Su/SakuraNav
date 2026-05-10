/**
* 笔记卡片管理 API 路由
* @description 处理笔记卡片的增删改查操作（底层存储在 cards 表中，card_type = 'note'）
* 保存/更新时自动清理无引用的笔记图片资源
*/

import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { createCard, updateCard, deleteCard, deleteAllNoteCards, getNoteCards, deleteAsset, findOrphanNoteAssets, getAssetsByNoteId, deleteAssetsByNoteId } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { cardToNoteCard } from "@/lib/base/types";
import { getCardById, getCardOwnerId, updateCardMemo, getAllSiteCardTodos } from "@/lib/services/card-repository";
import type { TodoItem } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";

const logger = createLogger("API:NoteCards");

/** 笔记卡片默认背景色 */
const NOTE_CARD_DEFAULT_COLOR = "#6366f1"; // indigo

/**
* 从 markdown 内容中提取引用的 asset ID 集合
* 匹配格式：![alt](/api/note-cards/img/asset-xxx) 或 [text](/api/note-cards/file/asset-xxx)
*/
function extractReferencedAssetIds(content: string): Set<string> {
  const ids = new Set<string>();
  // 笔记图片：![alt](/api/note-cards/img/asset-xxx)
  const imgRegex = /!\[.*?\]\(\/api\/note-cards\/img\/(asset-[0-9a-f-]+)\)/g;
  // 笔记文件：[text](/api/note-cards/file/asset-xxx)
  const fileRegex = /\[.*?\]\(\/api\/note-cards\/file\/(asset-[0-9a-f-]+)\)/g;
  // 笔记附件：[text](/api/note-cards/attach/asset-xxx)（旧格式兼容）
  const attachRegex = /\[.*?\]\(\/api\/note-cards\/attach\/(asset-[0-9a-f-]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(content)) !== null) ids.add(match[1]);
  while ((match = fileRegex.exec(content)) !== null) ids.add(match[1]);
  while ((match = attachRegex.exec(content)) !== null) ids.add(match[1]);
  return ids;
}

/**
* 清理所有笔记中未被引用的图片和文件资源
* 扫描所有笔记卡片内容，收集引用的 asset ID，删除不在引用集合中的 note-image/note-file 资源
*/
async function cleanupOrphanNoteImages(): Promise<void> {
  try {
    const allNotes = await getNoteCards();
    const allReferencedIds = new Set<string>();
    for (const note of allNotes) {
      const cardData = note.cardData ? JSON.parse(note.cardData) as { content?: string } : null;
      if (cardData?.content) {
        for (const id of extractReferencedAssetIds(cardData.content)) {
          allReferencedIds.add(id);
        }
      }
    }
    const orphans = await findOrphanNoteAssets(allReferencedIds);
    for (const orphan of orphans) {
      try { await fs.unlink(orphan.filePath); } catch { /* 文件可能已不存在 */ }
      await deleteAsset(orphan.id);
    }
    if (orphans.length > 0) {
      logger.info("清理孤立笔记附件", { count: orphans.length });
    }
  } catch (error) {
    logger.error("清理孤立笔记附件失败", error);
  }
}

/**
* 同步笔记引用的网站卡片 todo 列表
* 扫描所有笔记，为每个被引用的网站卡片添加/移除对应的 todo 项
* - 每条笔记对同一卡片的引用只产生一个 todo 项（去重）
* - 不同笔记引用同一卡片会产生多个 todo 项
* - 保留用户手动添加的 todo 项（通过前缀区分）
* @returns 受影响的网站卡片 ID 列表
*/
async function syncCardTodosFromNotes(): Promise<string[]> {
  const affectedCardIds: string[] = [];
  try {
    const allNotes = await getNoteCards();
    // 收集：cardId → Map<noteTitle, noteId>（去重：同一笔记多次引用同一卡片只记一次）
    const cardNoteMap = new Map<string, Map<string, string>>();

    for (const note of allNotes) {
      const cardData = note.cardData ? JSON.parse(note.cardData) as { content?: string; title?: string } : null;
      if (!cardData?.content) continue;

      const noteTitle = note.name || "未命名笔记";
      const cardIds = new Set<string>();

      // 提取所有被引用的 cardId（去重）
      const regex = /\[([^\]]*)\]\(sakura-site:\/\/([^)]*)\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(cardData.content)) !== null) {
        cardIds.add(match[2]);
      }

      for (const cardId of cardIds) {
        if (!cardNoteMap.has(cardId)) cardNoteMap.set(cardId, new Map());
        cardNoteMap.get(cardId)!.set(noteTitle, note.id);
      }
    }

    // 收集所有仍然活跃的 noteId 集合（当前仍被引用的笔记 ID）
    const activeNoteIds = new Set<string>();
    for (const noteTitleMap of cardNoteMap.values()) {
      for (const noteId of noteTitleMap.values()) {
        activeNoteIds.add(noteId);
      }
    }

    // 对每个仍被引用的网站卡片更新 todo
    for (const [cardId, noteTitleMap] of cardNoteMap) {
      const card = await getCardById(cardId);
      if (!card) continue;

      const existingTodos = card.todos;
      const manualTodos = existingTodos.filter((t) => !t.noteId);

      const autoTodos: TodoItem[] = [];
      for (const [title, noteId] of noteTitleMap) {
        const existing = existingTodos.find((t) => t.noteId === noteId);
        autoTodos.push({
          id: existing?.id ?? `note-todo-${crypto.randomUUID()}`,
          text: title,
          completed: existing?.completed ?? false,
          noteId,
        });
      }

      const merged = [...manualTodos, ...autoTodos];
      if (JSON.stringify(merged) !== JSON.stringify(existingTodos)) {
        await updateCardMemo(cardId, { todos: merged });
        affectedCardIds.push(cardId);
      }
    }

    // 清理：找出所有包含 noteId todo 的卡片，移除不再被引用的 todo
    const cardsWithNoteTodos = await getAllSiteCardTodos();

    for (const row of cardsWithNoteTodos) {
      if (!row.todos) continue;
      let todos: TodoItem[];
      try { todos = JSON.parse(row.todos); } catch { continue; }

      // 过滤掉 noteId 不在活跃集合中的 todo
      const filtered = todos.filter((t) => !t.noteId || activeNoteIds.has(t.noteId));
      if (filtered.length !== todos.length) {
        await updateCardMemo(row.id, { todos: filtered });
        if (!affectedCardIds.includes(row.id)) {
          affectedCardIds.push(row.id);
        }
      }
    }

  } catch (error) {
    logger.error("同步网站卡片 todo 失败", error);
  }
  return affectedCardIds;
}

export async function GET() {
  try {
    const session = await requireUserSession();
    logger.info("获取笔记卡片列表");
    const cards = await getNoteCards(session.userId);
    const noteCards = cards.map(cardToNoteCard).filter((c): c is NonNullable<typeof c> => c != null);
    return jsonOk({ items: noteCards });
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

    const card = await createCard({
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

    if (!card) return jsonError("创建失败", 500);
    const noteCard = cardToNoteCard(card);
    logger.info("笔记卡片创建成功", { cardId: card.id });
    // 异步清理无引用图片 + 同步网站 todo
    void cleanupOrphanNoteImages();
    const affectedCardIds = await syncCardTodosFromNotes();
    return jsonOk({ item: noteCard, affectedCardIds });
  } catch (error) {
    logger.error("创建笔记卡片失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return jsonError("卡片 ID 不能为空");
    }

    // 所有权校验：只有卡片所有者（或 admin）才能修改
    const cardOwnerId = await getCardOwnerId(id);
    if (!cardOwnerId) {
      return jsonError("卡片不存在", 404);
    }
    const ownerId = getEffectiveOwnerId(session);
    if (cardOwnerId !== ownerId) {
      logger.warning("笔记卡片修改被拒绝: 所有权不匹配", { cardId: id, userId: session.userId });
      return jsonError("无权操作此卡片", 403);
    }

    if (!content || !content.trim()) {
      return jsonError("请输入笔记内容");
    }

    const displayTitle = (title && title.trim())
      ? title.trim()
      : content.trim().replace(/[#*\n\r]/g, "").slice(0, 20) + (content.trim().length > 20 ? "..." : "");

    const card = await updateCard({
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

    const noteCard = card ? cardToNoteCard(card) : null;
    logger.info("笔记卡片更新成功", { cardId: id });
    // 同步网站 todo（编辑可能增减了网站引用）
    const affectedCardIds = await syncCardTodosFromNotes();
    // 不在 PUT 上执行孤立资源清理——为撤销恢复保留原始图片/文件引用
    return jsonOk({ item: noteCard, card, affectedCardIds });
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
      // 所有权校验：只有卡片所有者（或 admin）才能删除
      const cardOwnerId = await getCardOwnerId(id);
      if (!cardOwnerId) {
        return jsonError("卡片不存在", 404);
      }
      const ownerId = getEffectiveOwnerId(session);
      if (cardOwnerId !== ownerId) {
        logger.warning("笔记卡片删除被拒绝: 所有权不匹配", { cardId: id, userId: session.userId });
        return jsonError("无权操作此卡片", 403);
      }

      // 清理该笔记关联的附件文件
      const attachments = await getAssetsByNoteId(id);
      for (const att of attachments) {
        try { await fs.unlink(att.filePath); } catch { /* 文件可能已不存在 */ }
      }
      await deleteAssetsByNoteId(id);
      await deleteCard(id);
      logger.info("笔记卡片删除成功", { cardId: id });
    } else {
      // 批量删除时，清理所有笔记卡片的附件
      const allNotes = await getNoteCards(session.userId);
      for (const note of allNotes) {
        const attachments = await getAssetsByNoteId(note.id);
        for (const att of attachments) {
          try { await fs.unlink(att.filePath); } catch { /* 忽略 */ }
        }
        await deleteAssetsByNoteId(note.id);
      }
      await deleteAllNoteCards(session.userId);
      logger.info("已删除全部笔记卡片");
    }

    // 异步清理无引用图片 + 同步网站 todo
    void cleanupOrphanNoteImages();
    const affectedCardIds = await syncCardTodosFromNotes();
    return jsonOk({ ok: true, affectedCardIds });
  } catch {
    logger.warning("删除笔记卡片失败: 未授权");
    return jsonError("未授权", 401);
  }
}
