/**
 * @description MCP 工具注册 - 网站卡片模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getPaginatedCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  getAllCardsForAdmin,
  performSingleSiteCardOnlineCheck,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:SiteCards");

export function registerSiteCardTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_site_cards",
    "获取网站卡片列表（支持分页和筛选）",
    {
      tagId: z.string().optional().describe("按标签 ID 筛选"),
      query: z.string().optional().describe("搜索关键词"),
      cursor: z.string().optional().describe("分页游标"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const scope = params.tagId ? "tag" : "all";
      const result = await getPaginatedCards({
        ownerId,
        scope: scope as "all" | "tag",
        tagId: params.tagId ?? null,
        query: params.query ?? null,
        cursor: params.cursor ?? null,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_site_card",
    "获取单个网站卡片详情",
    {
      id: z.string().describe("网站卡片 ID"),
    },
    async (params) => {
      const card = await getCardById(params.id);
      if (!card) return { content: [{ type: "text", text: JSON.stringify({ error: "网站卡片不存在" }) }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "create_site_card",
    "创建一个新网站卡片",
    {
      name: z.string().min(1).max(80).describe("网站卡片名称"),
      url: z.string().describe("网站 URL"),
      description: z.string().max(200).optional().describe("描述"),
      iconUrl: z.string().max(500).optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).optional().describe("图标背景色"),
      isPinned: z.boolean().optional().describe("是否置顶"),
      skipOnlineCheck: z.boolean().optional().describe("是否跳过在线检测"),
      tagIds: z.array(z.string()).default([]).describe("关联的标签 ID 数组"),
      notes: z.string().max(5000).optional().describe("备注"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const url = params.url.trim();
      const skipOnlineCheck = params.skipOnlineCheck ?? false;
      const card = await createCard({
        name: params.name,
        siteUrl: url,
        siteDescription: params.description ?? null,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        siteIsPinned: params.isPinned ?? false,
        siteSkipOnlineCheck: skipOnlineCheck,
        tagIds: params.tagIds,
        ownerId,
        siteNotes: params.notes ?? "",
      });
      if (!card) return { content: [{ type: "text", text: JSON.stringify({ error: "创建失败" }) }], isError: true };
      logger.info("创建网站卡片", { cardId: card.id, name: card.name, url: card.siteUrl });
      // 异步触发在线检查（不阻塞响应）
      if (!skipOnlineCheck && card.id) {
        performSingleSiteCardOnlineCheck(card.id).catch((err) => logger.error("MCP 创建后在线检查失败", err));
      }
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "update_site_card",
    "更新已有网站卡片（部分更新：只修改传递的字段，未传递的字段保持原值不变）",
    {
      id: z.string().describe("网站卡片 ID"),
      name: z.string().min(1).max(80).optional().describe("名称"),
      url: z.string().optional().describe("网站 URL"),
      description: z.string().max(200).nullable().optional().describe("描述（传 null 清空）"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL（传 null 清空）"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色（传 null 清空）"),
      isPinned: z.boolean().optional().describe("是否置顶"),
      skipOnlineCheck: z.boolean().optional().describe("是否跳过在线检测"),
      tagIds: z.array(z.string()).optional().describe("关联的标签 ID 数组"),
      notes: z.string().max(5000).optional().describe("备注"),
    },
    async (params) => {
      const oldCard = await getCardById(params.id);
      if (!oldCard) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "网站卡片不存在" }) }], isError: true };
      }
      const name = params.name ?? oldCard.name;
      const url = params.url !== undefined ? params.url.trim() : oldCard.siteUrl;
      const skipOnlineCheck = params.skipOnlineCheck ?? oldCard.siteSkipOnlineCheck;
      const card = await updateCard({
        id: params.id,
        name,
        siteUrl: url,
        siteDescription: params.description !== undefined ? params.description : oldCard.siteDescription,
        iconUrl: params.iconUrl !== undefined ? params.iconUrl : oldCard.iconUrl,
        iconBgColor: params.iconBgColor !== undefined ? params.iconBgColor : oldCard.iconBgColor,
        siteIsPinned: params.isPinned ?? oldCard.siteIsPinned,
        siteSkipOnlineCheck: skipOnlineCheck,
        tagIds: params.tagIds ?? oldCard.tags.map((t) => t.id),
        siteNotes: params.notes !== undefined ? params.notes : (oldCard.siteNotes ?? ""),
      });
      if (!card) {
        logger.warning("更新网站卡片失败", { id: params.id });
        return { content: [{ type: "text", text: JSON.stringify({ error: "更新失败" }) }], isError: true };
      }
      logger.info("更新网站卡片", { cardId: card.id, name: card.name });
      // URL 变更或 skipOnlineCheck 从 true→false 时触发在线检查
      const urlChanged = oldCard.siteUrl !== url;
      const checkEnabled = oldCard.siteSkipOnlineCheck && !skipOnlineCheck;
      if (!skipOnlineCheck && (urlChanged || checkEnabled) && card.id) {
        performSingleSiteCardOnlineCheck(card.id).catch((err) => logger.error("MCP 更新后在线检查失败", err));
      }
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "delete_site_card",
    "删除网站卡片",
    {
      id: z.string().describe("网站卡片 ID"),
    },
    async (params) => {
      await deleteCard(params.id);
      logger.info("删除网站卡片", { cardId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );

  server.tool(
    "batch_create_site_cards",
    "批量创建网站卡片",
    {
      sites: z.array(z.object({
        name: z.string().min(1).max(80).describe("网站卡片名称"),
        url: z.string().describe("网站 URL"),
        description: z.string().max(200).optional().describe("描述"),
        tagIds: z.array(z.string()).default([]).describe("关联标签 ID"),
      })).min(1).max(50).describe("网站卡片数据数组（最多 50 个）"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const results = [];
      for (const item of params.sites) {
        const url = item.url.trim();
        const card = await createCard({
          name: item.name,
          siteUrl: url,
          siteDescription: item.description ?? null,
          iconUrl: null,
          siteIsPinned: false,
          tagIds: item.tagIds,
          ownerId,
        });
        if (card) {
          results.push({ id: card.id, name: card.name, url: card.siteUrl });
          // 异步触发在线检查
          performSingleSiteCardOnlineCheck(card.id).catch((err) => logger.error("MCP 批量创建后在线检查失败", err));
        }
      }
      logger.info("批量创建网站卡片", { total: params.sites.length, created: results.length });
      return { content: [{ type: "text", text: JSON.stringify({ created: results.length, sites: results }, null, 2) }] };
    }
  );

  server.tool(
    "list_all_site_cards",
    "获取全部网站卡片（不分页，返回完整列表，仅包含网站类型卡片，不含社交卡片和笔记卡片）",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const allCards = await getAllCardsForAdmin(ownerId);
      // 仅返回网站卡片（cardType 为 null 的）
      const siteCards = allCards.filter(c => c.cardType === null);
      return { content: [{ type: "text", text: JSON.stringify(siteCards.map(s => ({ id: s.id, name: s.name, url: s.siteUrl, tags: s.tags })), null, 2) }] };
    }
  );
}
