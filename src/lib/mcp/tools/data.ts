/**
 * @description MCP 工具注册 - 搜索模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getSearchSuggestions } from "@/lib/services";

export function registerDataTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "search_site_cards",
    "搜索网站卡片和标签",
    {
      query: z.string().min(1).describe("搜索关键词"),
      limit: z.number().min(1).max(20).optional().describe("返回结果数量（默认 8）"),
    },
    async (params) => {
      const session = getSession();
      const suggestions = await getSearchSuggestions({
        query: params.query,
        isAuthenticated: session.isAuthenticated,
        limit: params.limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(suggestions, null, 2) }] };
    }
  );
}
