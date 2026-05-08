/**
 * @description MCP Server 主入口 - 创建 McpServer 实例并注册工具
 * 支持通过外部注入 session 来实现每次请求的认证上下文
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { registerAllTools } from "./tools";

/**
 * 创建并配置一个 MCP Server 实例
 * @param getSession 获取当前认证用户会话的回调（由调用方注入）
 */
export function createMcpServer(getSession: () => SessionUser): McpServer {
  const server = new McpServer({
    name: "SakuraNav",
    version: "1.0.0",
  });

  registerAllTools(server, getSession);

  return server;
}
