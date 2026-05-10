/**
 * @description MCP 工具注册 - 全部卡片统一工具（网站卡片、社交卡片、笔记卡片）
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getAllCardsForAdmin,
  getCardById,
} from "@/lib/services";

export function registerCardTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_all_cards",
    "返回所有类型的卡片（网站卡片、社交卡片、笔记卡片）。社交卡片和笔记卡片只能关联一个标签，不可增删改。",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const cards = await getAllCardsForAdmin(ownerId);
      return { content: [{ type: "text", text: JSON.stringify(cards.map(c => ({
        id: c.id,
        name: c.name,
        url: c.siteUrl,
        cardType: c.cardType,
        iconUrl: c.iconUrl,
        iconBgColor: c.iconBgColor,
        isPinned: c.siteIsPinned,
        tags: c.tags,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })), null, 2) }] };
    }
  );

  server.tool(
    "get_card",
    "获取任意类型的单个卡片详情",
    {
      id: z.string().describe("卡片 ID"),
    },
    async (params) => {
      const card = await getCardById(params.id);
      if (!card) return { content: [{ type: "text", text: JSON.stringify({ error: "卡片不存在" }) }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );
}
