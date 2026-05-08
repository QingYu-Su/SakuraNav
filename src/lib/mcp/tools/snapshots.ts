/**
 * @description MCP 工具注册 - 快照模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getSnapshotMetas,
  createSnapshot,
  getSnapshotById,
  restoreFromSnapshot,
  deleteSnapshot,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:Snapshots");

export function registerSnapshotTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_snapshots",
    "获取所有快照列表",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const snapshots = await getSnapshotMetas(ownerId);
      return { content: [{ type: "text", text: JSON.stringify(snapshots, null, 2) }] };
    }
  );

  server.tool(
    "create_snapshot",
    "创建当前数据的快照（用于版本备份）",
    {
      label: z.string().max(100).optional().describe("快照标签/备注"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const snapshot = await createSnapshot(ownerId, params.label ?? `MCP 快照 ${new Date().toLocaleString()}`);
      if (!snapshot) return { content: [{ type: "text", text: JSON.stringify({ message: "数据无变化，快照已跳过" }) }] };
      logger.info("创建快照", { snapshotId: snapshot.id, label: params.label });
      return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
    }
  );

  server.tool(
    "get_snapshot",
    "获取快照详情（包含完整数据）",
    {
      id: z.string().describe("快照 ID"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const snapshot = await getSnapshotById(params.id, ownerId);
      if (!snapshot) return { content: [{ type: "text", text: JSON.stringify({ error: "快照不存在" }) }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
    }
  );

  server.tool(
    "restore_snapshot",
    "从快照恢复数据（会替换当前所有标签和网站数据）",
    {
      id: z.string().describe("要恢复的快照 ID"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const success = await restoreFromSnapshot(params.id, ownerId);
      if (!success) return { content: [{ type: "text", text: JSON.stringify({ error: "恢复失败，快照不存在" }) }], isError: true };
      logger.info("恢复快照", { snapshotId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "快照已恢复" }) }] };
    }
  );

  server.tool(
    "delete_snapshot",
    "删除快照",
    {
      id: z.string().describe("快照 ID"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const success = await deleteSnapshot(params.id, ownerId);
      if (!success) return { content: [{ type: "text", text: JSON.stringify({ error: "快照不存在" }) }], isError: true };
      logger.info("删除快照", { snapshotId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );
}
