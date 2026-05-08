/**
 * @description MCP 工具注册总入口 - 导入各模块工具并统一注册到 McpServer
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { registerTagTools } from "./tags";
import { registerSiteTools } from "./sites";
import { registerCardTools } from "./cards";
import { registerNoteTools } from "./notes";
import { registerSnapshotTools } from "./snapshots";
import { registerDataTools } from "./data";

/**
 * 注册所有 MCP 工具到 McpServer 实例
 * @param server McpServer 实例
 * @param getSession 获取当前认证用户会话的回调函数
 */
export function registerAllTools(server: McpServer, getSession: () => SessionUser): void {
  registerTagTools(server, getSession);
  registerSiteTools(server, getSession);
  registerCardTools(server, getSession);
  registerNoteTools(server, getSession);
  registerSnapshotTools(server, getSession);
  registerDataTools(server, getSession);
}
