/**
 * AI 助手 - 读操作工具定义
 * @description 查询类工具，AI 可自由调用，无副作用
 */

import { z } from "zod";
import { tool } from "ai";
import {
  getVisibleTags,
  getPaginatedSites,
  getAllSitesForAdmin,
  getSiteById,
  getSearchSuggestions,
  getAllCards,
} from "@/lib/services";
import { getNoteCardSites } from "@/lib/services/site-repository";

type ToolContext = {
  ownerId: string;
};

/** 创建读操作工具集 */
export function createReadTools(ctx: ToolContext) {
  return {
    list_tags: tool({
      description: "获取所有标签列表",
      inputSchema: z.object({}),
      execute: async () => {
        const tags = await getVisibleTags(ctx.ownerId);
        return tags.map((t) => ({
          id: t.id,
          name: t.name,
          logoUrl: t.logoUrl,
          description: t.description,
          siteCount: t.siteCount,
        }));
      },
    }),

    list_sites: tool({
      description: "获取网站列表（支持分页和按标签筛选）",
      inputSchema: z.object({
        tagId: z.string().optional().describe("按标签 ID 筛选"),
        query: z.string().optional().describe("搜索关键词"),
      }),
      execute: async ({ tagId, query }) => {
        const result = await getPaginatedSites({
          ownerId: ctx.ownerId,
          scope: tagId ? "tag" : "all",
          tagId: tagId ?? null,
          query: query ?? null,
          cursor: null,
        });
        return result.items.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          description: s.description,
          cardType: s.cardType,
          tags: s.tags.map((t) => ({ id: t.id, name: t.name })),
          isPinned: s.isPinned,
        }));
      },
    }),

    list_all_sites: tool({
      description: "获取全部网站（不分页，返回完整列表。cardType 为 null 表示普通网站卡片，非 null 表示社交/笔记卡片）",
      inputSchema: z.object({}),
      execute: async () => {
        const sites = await getAllSitesForAdmin(ctx.ownerId);
        return sites.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          cardType: s.cardType,
          isOnline: s.isOnline,
          tags: s.tags.map((t) => ({ id: t.id, name: t.name })),
        }));
      },
    }),

    get_site: tool({
      description: "获取单个网站详情",
      inputSchema: z.object({
        id: z.string().describe("网站 ID"),
      }),
      execute: async ({ id }) => {
        const site = await getSiteById(id);
        if (!site) return { error: "网站不存在" };
        return {
          id: site.id,
          name: site.name,
          url: site.url,
          description: site.description,
          iconUrl: site.iconUrl,
          tags: site.tags.map((t) => ({ id: t.id, name: t.name })),
          isPinned: site.isPinned,
          recommendContext: site.recommendContext,
          notes: site.notes,
        };
      },
    }),

    search_sites: tool({
      description: "搜索网站和标签",
      inputSchema: z.object({
        query: z.string().min(1).describe("搜索关键词"),
        limit: z.number().min(1).max(20).optional().describe("返回结果数量"),
      }),
      execute: async ({ query, limit }) => {
        return getSearchSuggestions({
          query,
          isAuthenticated: true,
          limit,
        });
      },
    }),

    list_cards: tool({
      description: "获取所有社交卡片列表",
      inputSchema: z.object({}),
      execute: async () => {
        const cards = await getAllCards();
        return cards.map((c) => ({
          id: c.id,
          cardType: c.cardType,
          label: c.label,
          iconUrl: c.iconUrl,
        }));
      },
    }),

    list_notes: tool({
      description: "获取所有笔记卡片列表",
      inputSchema: z.object({}),
      execute: async () => {
        const sites = await getNoteCardSites(ctx.ownerId);
        return sites.map((s) => {
          const data = s.cardData ? JSON.parse(s.cardData) as { content?: string } : {};
          return {
            id: s.id,
            title: s.name,
            content: data.content ?? "",
            iconUrl: s.iconUrl,
            iconBgColor: s.iconBgColor,
          };
        });
      },
    }),
  };
}
