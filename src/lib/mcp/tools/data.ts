/**
 * @description MCP 工具注册 - 数据模块（搜索、设置、导出）
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getSearchSuggestions, getAppSettings } from "@/lib/services";

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

  server.tool(
    "get_settings",
    "获取应用设置（站点名称、AI 配置等，敏感信息已掩码）",
    {},
    async () => {
      const settings = await getAppSettings();
      return { content: [{ type: "text", text: JSON.stringify(settings, null, 2) }] };
    }
  );

  server.tool(
    "get_profile",
    "获取当前 Token 对应的用户信息",
    {},
    async () => {
      const session = getSession();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            username: session.username,
            userId: session.userId,
            role: session.role,
            nickname: session.nickname,
          }, null, 2),
        }],
      };
    }
  );
}
