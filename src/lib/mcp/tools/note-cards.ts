/**
 * @description MCP 工具注册 - 笔记卡片模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getNoteCards,
  createCard,
  getCardById,
  updateCard,
  deleteCard,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:NoteCards");

export function registerNoteCardTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_note_cards",
    "获取所有笔记卡片列表。注意：笔记卡片只能关联一个标签，创建时指定，不可增删改。",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const cards = await getNoteCards(ownerId);
      const notes = cards.map((c) => {
        const data = c.cardData ? JSON.parse(c.cardData) as { title?: string; content?: string } : {};
        return {
          id: c.id,
          title: c.name,
          content: data.content ?? "",
          iconUrl: c.iconUrl,
          iconBgColor: c.iconBgColor,
          globalSortOrder: c.globalSortOrder,
          tags: c.tags,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          _tagNote: "此卡片只能绑定一个标签，创建时指定，不可增删改",
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
    }
  );

  server.tool(
    "create_note_card",
    "创建一张笔记卡片。创建时需通过 tagId 指定一个标签。社交/笔记卡片只能关联一个标签，一旦创建后该标签不可修改、删除或新增。",
    {
      title: z.string().min(1).max(80).describe("笔记标题"),
      content: z.string().max(50000).optional().describe("笔记内容（支持 Markdown）"),
      iconUrl: z.string().max(500).optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).optional().describe("图标背景色"),
      tagId: z.string().optional().describe("关联的标签 ID（只能关联一个标签）"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const cardData = JSON.stringify({ title: params.title, content: params.content ?? "" });
      const tagIds = params.tagId ? [params.tagId] : [];
      const card = await createCard({
        name: params.title,
        url: `note://${crypto.randomUUID()}`,
        description: null,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        isPinned: false,
        tagIds,
        ownerId,
        cardType: "note",
        cardData,
      });
      if (!card) return { content: [{ type: "text", text: JSON.stringify({ error: "创建失败" }) }], isError: true };
      logger.info("创建笔记卡片", { noteId: card.id, title: params.title });
      const data = card.cardData ? JSON.parse(card.cardData) as { content?: string } : {};
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: card.id, title: card.name, content: data.content ?? "",
            iconUrl: card.iconUrl, iconBgColor: card.iconBgColor,
            tags: card.tags,
            _tagNote: "此卡片只能绑定一个标签，创建时指定，不可增删改",
            createdAt: card.createdAt, updatedAt: card.updatedAt,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "update_note_card",
    "更新笔记卡片（部分更新：只修改传递的字段，未传递的字段保持原值不变）",
    {
      id: z.string().describe("笔记卡片 ID"),
      title: z.string().min(1).max(80).optional().describe("笔记标题"),
      content: z.string().max(50000).optional().describe("笔记内容（支持 Markdown）"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL（传 null 清空）"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色（传 null 清空）"),
    },
    async (params) => {
      const existing = await getCardById(params.id);
      if (!existing || existing.cardType !== "note") {
        logger.warning("更新笔记卡片失败: 笔记不存在", { id: params.id });
        return { content: [{ type: "text", text: JSON.stringify({ error: "笔记不存在" }) }], isError: true };
      }
      const existingData = existing.cardData ? JSON.parse(existing.cardData) as { title?: string; content?: string } : {};
      const title = params.title ?? existing.name;
      const content = params.content !== undefined ? params.content : (existingData.content ?? "");
      const cardData = JSON.stringify({ title, content });
      const card = await updateCard({
        id: params.id,
        name: title,
        url: existing.url,
        description: existing.description,
        iconUrl: params.iconUrl !== undefined ? params.iconUrl : existing.iconUrl,
        iconBgColor: params.iconBgColor !== undefined ? params.iconBgColor : existing.iconBgColor,
        isPinned: existing.isPinned,
        tagIds: existing.tags.map((t) => t.id),
        cardType: "note",
        cardData,
      });
      if (!card) return { content: [{ type: "text", text: JSON.stringify({ error: "更新失败" }) }], isError: true };
      logger.info("更新笔记卡片", { noteId: card.id, title });
      const data = card.cardData ? JSON.parse(card.cardData) as { content?: string } : {};
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: card.id, title: card.name, content: data.content ?? "",
            iconUrl: card.iconUrl, iconBgColor: card.iconBgColor,
            createdAt: card.createdAt, updatedAt: card.updatedAt,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "delete_note_card",
    "删除笔记卡片",
    {
      id: z.string().describe("笔记卡片 ID"),
    },
    async (params) => {
      await deleteCard(params.id);
      logger.info("删除笔记卡片", { noteId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );
}
