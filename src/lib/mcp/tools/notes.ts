/**
 * @description MCP 工具注册 - 笔记卡片模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getNoteCardSites,
  createSite,
  getSiteById,
  updateSite,
  deleteSite,
} from "@/lib/services";

export function registerNoteTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_notes",
    "获取所有笔记卡片列表",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const sites = await getNoteCardSites(ownerId);
      const notes = sites.map((s) => {
        const data = s.cardData ? JSON.parse(s.cardData) as { title?: string; content?: string } : {};
        return {
          id: s.id,
          title: s.name,
          content: data.content ?? "",
          iconUrl: s.iconUrl,
          iconBgColor: s.iconBgColor,
          globalSortOrder: s.globalSortOrder,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
    }
  );

  server.tool(
    "create_note",
    "创建一张笔记卡片",
    {
      title: z.string().min(1).max(80).describe("笔记标题"),
      content: z.string().max(50000).optional().describe("笔记内容（支持 Markdown）"),
      iconUrl: z.string().max(500).optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).optional().describe("图标背景色"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const cardData = JSON.stringify({ title: params.title, content: params.content ?? "" });
      const site = await createSite({
        name: params.title,
        url: `note://${crypto.randomUUID()}`,
        description: null,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        isPinned: false,
        tagIds: [],
        ownerId,
        cardType: "note",
        cardData,
      });
      if (!site) return { content: [{ type: "text", text: JSON.stringify({ error: "创建失败" }) }], isError: true };
      const data = site.cardData ? JSON.parse(site.cardData) as { content?: string } : {};
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: site.id, title: site.name, content: data.content ?? "",
            iconUrl: site.iconUrl, iconBgColor: site.iconBgColor,
            createdAt: site.createdAt, updatedAt: site.updatedAt,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "update_note",
    "更新笔记卡片",
    {
      id: z.string().describe("笔记 ID"),
      title: z.string().min(1).max(80).describe("笔记标题"),
      content: z.string().max(50000).optional().describe("笔记内容"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色"),
    },
    async (params) => {
      const existing = await getSiteById(params.id);
      if (!existing || existing.cardType !== "note") {
        return { content: [{ type: "text", text: JSON.stringify({ error: "笔记不存在" }) }], isError: true };
      }
      const cardData = JSON.stringify({ title: params.title, content: params.content ?? "" });
      const site = await updateSite({
        id: params.id,
        name: params.title,
        url: existing.url,
        description: existing.description,
        iconUrl: params.iconUrl ?? existing.iconUrl,
        iconBgColor: params.iconBgColor ?? existing.iconBgColor,
        isPinned: existing.isPinned,
        tagIds: existing.tags.map((t) => t.id),
        cardType: "note",
        cardData,
      });
      if (!site) return { content: [{ type: "text", text: JSON.stringify({ error: "更新失败" }) }], isError: true };
      const data = site.cardData ? JSON.parse(site.cardData) as { content?: string } : {};
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: site.id, title: site.name, content: data.content ?? "",
            iconUrl: site.iconUrl, iconBgColor: site.iconBgColor,
            createdAt: site.createdAt, updatedAt: site.updatedAt,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "delete_note",
    "删除笔记卡片",
    {
      id: z.string().describe("笔记 ID"),
    },
    async (params) => {
      await deleteSite(params.id);
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );
}
